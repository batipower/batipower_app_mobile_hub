import { io, type Socket } from 'socket.io-client';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import { queryClient } from '@/api/queryClient';
import type { AnalysisCompletePayload, AnalysisErrorPayload, AnalysisInputRequiredPayload, AnalysisStepPayload } from '@/features/product-analyzer/lib/analyze-types';
import { warehouseOrDefault } from '@/features/product-analyzer/lib/analyze-types';
import { getReserveClaimToken } from '@/features/product-analyzer/lib/claim-token';
import { STEPS_DEF } from '@/features/product-analyzer/lib/constants';
import { PA_ROOT } from '@/features/product-analyzer/queryKeys';
import type {
  AlreadyAnalyzedData,
  AnalysisReusedData,
  BlockedData,
  StepData,
} from '@/types/hubProductAnalyzer';

import {
  INTERRUPTED_MESSAGE,
  SOCKET_DOWN_MESSAGE,
  START_TIMEOUT_MESSAGE,
  type AnalyzeRequest,
  type EngineState,
  type LiveJob,
  type QueueItem,
  type QueueSeed,
  type QueueSource,
  type QueueState,
  type SingleRunState,
} from './types';

/** Attente maximale de la première réponse du serveur après un lancement. */
const START_TIMEOUT_MS = 60_000;
/** Après une reconnexion en cours de file, délai avant de relancer l'élément interrompu. */
const RECONNECT_WATCHDOG_MS = 15_000;
const TICKET_RETRY_MS = 4_000;

const EMPTY_LIVE: LiveJob = { jobId: null, steps: {}, mpData: {}, startedAt: null };

const INITIAL_SINGLE: SingleRunState = {
  phase: 'idle',
  runId: 0,
  request: null,
  errors: [],
  stagingId: null,
  result: null,
  blocked: null,
  alreadyAnalyzed: null,
  reused: null,
  weight: null,
  elapsedMs: 0,
};

const INITIAL_QUEUE: QueueState = {
  open: false,
  running: false,
  source: 'rerun',
  items: [],
  currentIdx: 0,
  startedAt: null,
  reserveReleased: false,
};

type Listener = () => void;

/**
 * Moteur des analyses temps réel du Product Analyzer : possède la connexion socket.io, l'analyse
 * unitaire et la file d'analyses. Hors de React (store + `useSyncExternalStore`) pour que les
 * événements du socket n'aient jamais de fermeture périmée, et pour qu'une analyse continue
 * quand l'utilisateur quitte l'écran « live ».
 *
 * Contrat socket identique au web (`useProductAnalyzerSocket`) : `analyze:start`,
 * `analyze:start-by-ean`, `analyze:cancel`, `analysis:input_response` ; événements `analysis:*`.
 */
export class AnalyzerEngine {
  private socket: Socket | null = null;
  private listeners = new Set<Listener>();
  private state: EngineState = {
    connection: { connected: false, error: null },
    live: EMPTY_LIVE,
    single: INITIAL_SINGLE,
    queue: INITIAL_QUEUE,
  };

  private jobId: string | null = null;
  private mode: 'idle' | 'single' | 'queue' = 'idle';
  private disposed = false;
  private connecting = false;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private ticketTimer: ReturnType<typeof setTimeout> | null = null;
  private lostDuringJob = false;
  private itemStartedAt = 0;
  private cancelledBeforeStart = false;

  // ─── Store ────────────────────────────────────────────────────────────────

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = () => this.state;

  private set(patch: Partial<EngineState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private setSingle(patch: Partial<SingleRunState>) {
    this.set({ single: { ...this.state.single, ...patch } });
  }

  private setQueue(patch: Partial<QueueState>) {
    this.set({ queue: { ...this.state.queue, ...patch } });
  }

  private setLive(patch: Partial<LiveJob>) {
    this.set({ live: { ...this.state.live, ...patch } });
  }

  private patchItem(idx: number, patch: Partial<QueueItem>) {
    const items = this.state.queue.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    this.setQueue({ items });
  }

  // ─── Connexion ────────────────────────────────────────────────────────────

  async connect() {
    this.disposed = false;
    if (this.connecting || this.socket) return;
    this.connecting = true;
    try {
      const ticket = await hubProductAnalyzerApi.getWsTicket();
      if (this.disposed) return;
      if (!ticket.wsUrl) throw new Error('Ticket WS sans url');
      const socket = io(ticket.wsUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        timeout: 15_000,
      });
      this.bind(socket);
      this.socket = socket;
      this.set({ connection: { connected: false, error: null } });
    } catch (error) {
      this.set({
        connection: {
          connected: false,
          error: error instanceof Error ? error.message : 'Ticket WS indisponible',
        },
      });
      if (!this.disposed) {
        this.ticketTimer = setTimeout(() => {
          this.ticketTimer = null;
          void this.connect();
        }, TICKET_RETRY_MS);
      }
    } finally {
      this.connecting = false;
    }
  }

  /** Relance la connexion si elle est tombée (retour au premier plan). */
  ensureConnected() {
    if (this.disposed) return;
    if (!this.socket) {
      void this.connect();
      return;
    }
    if (!this.socket.connected) this.socket.connect();
  }

  dispose() {
    this.disposed = true;
    this.clearStartTimer();
    this.clearWatchdog();
    if (this.ticketTimer) clearTimeout(this.ticketTimer);
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.set({ connection: { connected: false, error: null } });
  }

  private bind(socket: Socket) {
    socket.on('connect', () => {
      this.set({ connection: { connected: true, error: null } });
      if (this.lostDuringJob) {
        this.lostDuringJob = false;
        this.onReconnectedDuringJob();
      }
    });

    socket.on('disconnect', (reason) => {
      this.set({ connection: { connected: false, error: null } });
      if (this.isJobActive()) this.lostDuringJob = true;
      if (reason === 'io server disconnect') socket.connect();
    });

    socket.on('connect_error', (err: Error) => {
      this.set({ connection: { connected: false, error: err.message || 'Connexion impossible' } });
    });

    // Erreur levée dans un handler du gateway Nest : aucun événement `analysis:*` ne suit.
    socket.on('exception', (d: { message?: string } | string) => {
      const message = typeof d === 'string' ? d : d?.message || "Erreur serveur pendant l'analyse";
      this.handleError({ jobId: this.jobId ?? '', step: 'serveur', message, fatal: true });
    });

    socket.on('analysis:started', (d: { jobId: string }) => this.handleStarted(d));
    socket.on('analysis:step', (d: AnalysisStepPayload) => {
      if (this.jobId && d.jobId !== this.jobId) return;
      this.handleStep(d);
    });
    socket.on('analysis:complete', (d: AnalysisCompletePayload) => {
      if (this.jobId && d.jobId !== this.jobId) return;
      this.handleComplete(d);
    });
    socket.on('analysis:error', (d: AnalysisErrorPayload) => {
      if (this.jobId && d.jobId !== this.jobId) return;
      this.handleError(d);
    });
    socket.on('analysis:input_required', (d: AnalysisInputRequiredPayload) => {
      if (this.jobId && d.jobId !== this.jobId) return;
      this.handleInputRequired(d);
    });
    socket.on('analysis:input_timeout', () => {
      this.setSingle({
        weight: null,
        errors: [...this.state.single.errors, 'Délai de saisie du poids dépassé — 0 g utilisé'],
      });
    });
    socket.on('analysis:cancelled', () => this.handleCancelled());
    socket.on('analysis:blocked', (d: BlockedData) => this.handleBlocked(d));
    socket.on('analysis:already_analyzed', (d: AlreadyAnalyzedData) => this.handleAlreadyAnalyzed(d));
    socket.on('analysis:reused', (d: AnalysisReusedData) => this.handleReused(d));
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────

  private isJobActive(): boolean {
    if (this.mode === 'single') {
      const phase = this.state.single.phase;
      return phase === 'pending' || phase === 'running';
    }
    if (this.mode === 'queue') return this.state.queue.running;
    return false;
  }

  private clearStartTimer() {
    if (this.startTimer) clearTimeout(this.startTimer);
    this.startTimer = null;
  }

  private clearWatchdog() {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private armStartTimer(onTimeout: () => void) {
    this.clearStartTimer();
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      onTimeout();
    }, START_TIMEOUT_MS);
  }

  private invalidateStaging() {
    void queryClient.invalidateQueries({ queryKey: PA_ROOT });
  }

  private emitStart(start: AnalyzeRequest['start'], skipWeight: boolean): boolean {
    const socket = this.socket;
    if (!socket?.connected) return false;
    this.jobId = null;
    if (start.type === 'ean') socket.emit('analyze:start-by-ean', { ...start.payload, skipWeight });
    else socket.emit('analyze:start', { ...start.payload, skipWeight });
    return true;
  }

  private resetLive() {
    this.set({ live: { ...EMPTY_LIVE } });
  }

  private assignAffaire(stagingId: string, affaireId: string, warehouse: string | null | undefined) {
    hubProductAnalyzerApi
      .assignToAffaire(affaireId, {
        stagingUuids: [stagingId],
        warehouse: warehouseOrDefault(warehouse),
      })
      .catch(() => undefined);
  }

  // ─── Analyse unitaire ─────────────────────────────────────────────────────

  /** Lance une analyse unitaire. Renvoie `false` si la connexion est indisponible. */
  startSingle(request: AnalyzeRequest): boolean {
    // Une file en cours occupe le serveur : on ne mélange pas les deux.
    if (this.state.queue.running) return false;
    this.mode = 'single';
    this.cancelledBeforeStart = false;
    this.lostDuringJob = false;
    this.resetLive();
    const runId = this.state.single.runId + 1;
    const base: SingleRunState = { ...INITIAL_SINGLE, runId, request };

    if (!this.emitStart(request.start, request.skipWeight)) {
      this.set({
        single: { ...base, phase: 'failed', errors: [SOCKET_DOWN_MESSAGE] },
      });
      this.ensureConnected();
      return false;
    }
    this.set({ single: { ...base, phase: 'pending' } });
    this.armStartTimer(() => {
      this.setSingle({ phase: 'failed', errors: [START_TIMEOUT_MESSAGE] });
    });
    return true;
  }

  retrySingle(): boolean {
    const request = this.state.single.request;
    return request ? this.startSingle(request) : false;
  }

  /** Annule l'analyse unitaire (avant ou après `analysis:started`). */
  cancelSingle() {
    const phase = this.state.single.phase;
    if (phase !== 'pending' && phase !== 'running') return;
    this.clearStartTimer();
    if (this.jobId && this.socket) {
      this.socket.emit('analyze:cancel', { jobId: this.jobId });
    } else {
      // Le serveur n'a pas encore répondu : on annulera dès `analysis:started`.
      this.cancelledBeforeStart = true;
    }
    this.jobId = null;
    this.setSingle({ phase: 'cancelled', weight: null });
  }

  /** Réponse à la demande de poids (grammes ; 0 = ignorer). */
  respondWeight(grams: number) {
    const weight = this.state.single.weight;
    if (!weight) return;
    this.socket?.emit('analysis:input_response', {
      jobId: weight.jobId,
      field: weight.field,
      value: grams,
    });
    this.setSingle({ weight: null });
  }

  /** L'utilisateur a pris acte de l'issue (fiche ouverte, fermeture d'une boîte de dialogue). */
  resetSingle() {
    this.clearStartTimer();
    if (this.mode === 'single') this.mode = 'idle';
    this.jobId = null;
    this.resetLive();
    this.set({ single: { ...INITIAL_SINGLE, runId: this.state.single.runId } });
  }

  // ─── File d'analyses ──────────────────────────────────────────────────────

  startQueue(seeds: QueueSeed[], source: QueueSource): boolean {
    if (seeds.length === 0) return false;
    if (this.state.queue.running) return false;
    const phase = this.state.single.phase;
    if (phase === 'pending' || phase === 'running') return false;
    if (!this.socket?.connected) {
      this.ensureConnected();
      return false;
    }
    this.mode = 'queue';
    this.lostDuringJob = false;
    this.resetLive();
    const items: QueueItem[] = seeds.map((seed, i) => ({
      ...seed,
      id: `${i}-${seed.code}`,
      status: 'pending',
      stagingId: null,
      errorMsg: null,
      elapsedMs: 0,
    }));
    this.set({
      queue: {
        open: true,
        running: true,
        source,
        items,
        currentIdx: 0,
        startedAt: Date.now(),
        reserveReleased: false,
      },
    });
    this.startQueueItem(0);
    return true;
  }

  /** Arrête la file : annule l'analyse en cours et rend les lignes de réserve non traitées. */
  stopQueue() {
    const queue = this.state.queue;
    if (!queue.running) return;
    this.clearStartTimer();
    this.clearWatchdog();
    if (this.jobId && this.socket) this.socket.emit('analyze:cancel', { jobId: this.jobId });
    this.jobId = null;
    const unfinished = queue.items.filter((it) => it.status === 'pending' || it.status === 'analyzing');
    const reserveUuids = unfinished.map((it) => it.reserveUuid).filter((u): u is string => !!u);
    this.setQueue({
      running: false,
      items: queue.items.map((it) =>
        it.status === 'pending' || it.status === 'analyzing'
          ? { ...it, status: 'error', errorMsg: 'Annulé' }
          : it,
      ),
    });
    this.resetLive();
    this.mode = 'idle';
    if (reserveUuids.length > 0) void this.markFailed(reserveUuids);
    this.invalidateStaging();
  }

  closeQueue() {
    if (this.state.queue.running) return;
    this.set({ queue: { ...INITIAL_QUEUE } });
  }

  /** Lignes de réserve encore détenues par ce poste (heartbeat). */
  getReserveUuids = (): string[] => {
    const queue = this.state.queue;
    if (!queue.running || queue.reserveReleased) return [];
    return queue.items
      .filter((it) => it.reserveUuid && (it.status === 'pending' || it.status === 'analyzing'))
      .map((it) => it.reserveUuid as string);
  };

  /** Lignes reprises par un autre poste : les éléments concernés sont abandonnés. */
  handleReserveLost = (uuids: string[]) => {
    if (uuids.length === 0) return;
    const lost = new Set(uuids);
    const current = this.state.queue.items[this.state.queue.currentIdx];
    const items = this.state.queue.items.map((it) =>
      it.reserveUuid && lost.has(it.reserveUuid) && (it.status === 'pending' || it.status === 'analyzing')
        ? { ...it, status: 'error' as const, errorMsg: 'Repris par un autre poste' }
        : it,
    );
    this.setQueue({ items });
    if (current?.reserveUuid && lost.has(current.reserveUuid) && this.state.queue.running) {
      // L'élément en cours n'est plus à nous : on abandonne son job et on passe au suivant.
      if (this.jobId && this.socket) this.socket.emit('analyze:cancel', { jobId: this.jobId });
      this.jobId = null;
      this.advanceQueue(this.state.queue.currentIdx + 1);
    }
  };

  /** L'app passe en arrière-plan : les lignes de réserve non traitées sont rendues. */
  async onBackground() {
    const uuids = this.getReserveUuids();
    if (uuids.length === 0) return;
    this.setQueue({ reserveReleased: true });
    try {
      await hubProductAnalyzerApi.releaseReserve(await getReserveClaimToken());
    } catch {
      // Sans retour, le serveur libère les lignes faute de battement.
    }
  }

  /** Retour au premier plan : on reprend ses lignes de réserve, puis la connexion. */
  async onForeground() {
    this.ensureConnected();
    this.invalidateStaging();
    const queue = this.state.queue;
    if (!queue.running || !queue.reserveReleased) return;
    const pendingUuids = queue.items
      .filter((it) => it.reserveUuid && (it.status === 'pending' || it.status === 'analyzing'))
      .map((it) => it.reserveUuid as string);
    let reclaimed = new Set<string>();
    try {
      const res = await hubProductAnalyzerApi.reclaimReserve(await getReserveClaimToken(), pendingUuids);
      reclaimed = new Set(res.reclaimed ?? []);
    } catch {
      // Réseau coupé : on considère les lignes perdues.
    }
    const items = this.state.queue.items.map((it) =>
      it.reserveUuid &&
      (it.status === 'pending' || it.status === 'analyzing') &&
      !reclaimed.has(it.reserveUuid)
        ? { ...it, status: 'error' as const, errorMsg: 'Repris par un autre poste' }
        : it,
    );
    this.setQueue({ items, reserveReleased: false });
    const current = items[this.state.queue.currentIdx];
    if (this.state.queue.running && (!current || current.status !== 'analyzing')) {
      this.advanceQueue(this.state.queue.currentIdx);
    }
  }

  private async markFailed(reserveUuids: string[]) {
    const CHUNK = 200;
    const token = await getReserveClaimToken();
    for (let i = 0; i < reserveUuids.length; i += CHUNK) {
      try {
        await hubProductAnalyzerApi.markReserveFailed(reserveUuids.slice(i, i + CHUNK), token);
      } catch {
        // Un lot en échec ne bloque pas les suivants.
      }
    }
  }

  private async markDone(reserveUuid: string, stagingUuid: string) {
    try {
      await hubProductAnalyzerApi.markReserveDone(reserveUuid, stagingUuid, await getReserveClaimToken());
    } catch {
      // Le serveur libère la ligne si elle reste sans nouvelles.
    }
  }

  private startQueueItem(idx: number) {
    const items = this.state.queue.items;
    let next = idx;
    while (next < items.length && items[next]?.status !== 'pending') next += 1;
    if (next >= items.length) {
      this.finishQueue();
      return;
    }
    const item = items[next] as QueueItem;
    this.setQueue({ currentIdx: next });
    this.itemStartedAt = Date.now();
    this.resetLive();
    // Première réponse attendue : sinon on abandonne l'élément et on passe au suivant.
    this.armStartTimer(() => this.failQueueItem(next, START_TIMEOUT_MESSAGE));

    const ok =
      item.refType === 'ean'
        ? this.emitStart(
            {
              type: 'ean',
              payload: {
                ean: item.code,
                warehouse: item.warehouse || undefined,
                distributorId: item.distributorId || undefined,
                estimatedBuyPriceHT: item.estimatedBuyPriceHT ?? undefined,
                forceReanalyze: true,
                forceCatalogue: item.forceCatalogue || undefined,
              },
            },
            true,
          )
        : this.emitStart(
            {
              type: 'ebat',
              payload: {
                codeEbat: item.code,
                // Déstockage : l'entrepôt vient du distributeur du lot, jamais de repli Dombasle.
                warehouse: item.warehouse || (item.distributorId ? undefined : 'DOMBASLE'),
                distributorId: item.distributorId || undefined,
                forceReanalyze: true,
                forceCatalogue: item.forceCatalogue || undefined,
              },
            },
            true,
          );
    if (!ok) {
      this.failQueueItem(next, SOCKET_DOWN_MESSAGE, false);
    }
  }

  private advanceQueue(fromIdx: number) {
    this.clearStartTimer();
    this.clearWatchdog();
    this.jobId = null;
    this.resetLive();
    if (this.state.queue.running) this.startQueueItem(fromIdx);
  }

  private finishQueue() {
    this.clearStartTimer();
    this.clearWatchdog();
    this.jobId = null;
    this.setQueue({ running: false });
    this.resetLive();
    this.mode = 'idle';
    this.invalidateStaging();
  }

  private failQueueItem(
    idx: number,
    message: string,
    advance = true,
    status: 'error' | 'blocked' = 'error',
  ) {
    const item = this.state.queue.items[idx];
    this.patchItem(idx, { status, errorMsg: message });
    if (item?.reserveUuid) void this.markFailed([item.reserveUuid]);
    if (advance) this.advanceQueue(idx + 1);
  }

  /** Connexion rétablie pendant un job : la file relance l'élément si rien n'arrive. */
  private onReconnectedDuringJob() {
    if (this.mode === 'single') {
      this.clearStartTimer();
      this.setSingle({ phase: 'interrupted', errors: [INTERRUPTED_MESSAGE], weight: null });
      this.invalidateStaging();
      return;
    }
    if (this.mode === 'queue' && this.state.queue.running) {
      this.clearWatchdog();
      const idx = this.state.queue.currentIdx;
      this.watchdog = setTimeout(() => {
        this.watchdog = null;
        if (!this.state.queue.running) return;
        this.patchItem(idx, { status: 'pending' });
        this.startQueueItem(idx);
      }, RECONNECT_WATCHDOG_MS);
    }
  }

  // ─── Événements du serveur ────────────────────────────────────────────────

  private handleStarted(d: { jobId: string }) {
    this.clearStartTimer();
    if (this.cancelledBeforeStart && this.mode === 'single') {
      this.cancelledBeforeStart = false;
      this.socket?.emit('analyze:cancel', { jobId: d.jobId });
      return;
    }
    this.jobId = d.jobId;
    this.setLive({ jobId: d.jobId, startedAt: Date.now(), steps: {}, mpData: {} });
    if (this.mode === 'single') {
      this.setSingle({ phase: 'running', errors: [] });
    } else if (this.mode === 'queue') {
      this.patchItem(this.state.queue.currentIdx, { status: 'analyzing' });
    }
  }

  private handleStep(d: AnalysisStepPayload) {
    this.clearWatchdog();
    const label = STEPS_DEF.find((x) => x.key === d.step)?.label ?? d.step;
    const entry: StepData = { step: d.step, status: d.status, label, data: d.data };
    if (d.step.startsWith('4_') && d.step !== '4_start') {
      const key = d.step.replace('4_', '');
      this.setLive({
        mpData: { ...this.state.live.mpData, [key]: { ...entry, label: key } },
      });
    } else {
      this.setLive({ steps: { ...this.state.live.steps, [d.step]: entry } });
    }
  }

  private handleComplete(d: AnalysisCompletePayload) {
    this.clearStartTimer();
    this.clearWatchdog();
    // Une analyse met à jour `lastAnalyzedAt` : les listes staging sont à recharger.
    this.invalidateStaging();
    this.jobId = null;

    if (this.mode === 'queue') {
      this.completeQueueItem(d);
      return;
    }

    const request = this.state.single.request;
    const elapsedMs = this.state.live.startedAt ? Date.now() - this.state.live.startedAt : 0;
    if (d.success === false) {
      if (d.reason === 'EBAT_NOT_FOUND' && d.stagingId) {
        this.setSingle({ phase: 'ebat_not_found', stagingId: d.stagingId, errors: [], elapsedMs });
      } else {
        const errors = d.error ? [d.error] : ['Analyse échouée'];
        this.setSingle({ phase: 'failed', errors, elapsedMs });
      }
      return;
    }
    if (d.stagingId && request?.affaireId) {
      this.assignAffaire(d.stagingId, request.affaireId, request.warehouse);
    }
    this.setSingle({
      phase: 'completing',
      stagingId: d.stagingId,
      result: d.result,
      weight: null,
      elapsedMs,
    });
  }

  private completeQueueItem(d: AnalysisCompletePayload) {
    const idx = this.state.queue.currentIdx;
    const item = this.state.queue.items[idx];
    const elapsedMs = Date.now() - this.itemStartedAt;
    if (!item) return;

    if (d.success === false) {
      if (d.reason === 'EBAT_NOT_FOUND' && d.stagingId) {
        this.patchItem(idx, { status: 'ebat_not_found', stagingId: d.stagingId, elapsedMs });
        if (item.reserveUuid) void this.markDone(item.reserveUuid, d.stagingId);
        this.advanceQueue(idx + 1);
      } else {
        this.failQueueItem(idx, d.error || 'Analyse échouée');
      }
      return;
    }
    if (d.stagingId && item.affaireId) this.assignAffaire(d.stagingId, item.affaireId, item.warehouse);
    this.patchItem(idx, { status: 'done', stagingId: d.stagingId, elapsedMs });
    if (item.reserveUuid && d.stagingId) void this.markDone(item.reserveUuid, d.stagingId);
    this.advanceQueue(idx + 1);
  }

  private handleError(d: AnalysisErrorPayload) {
    if (d.fatal) this.clearStartTimer();
    this.clearWatchdog();
    if (this.mode === 'queue') {
      if (d.fatal) {
        this.jobId = null;
        this.failQueueItem(this.state.queue.currentIdx, d.message);
      }
      return;
    }
    const errors = [...this.state.single.errors, d.step ? `[${d.step}] ${d.message}` : d.message];
    if (d.fatal) {
      this.jobId = null;
      this.setSingle({ phase: 'failed', errors, weight: null });
    } else {
      this.setSingle({ errors });
    }
  }

  private handleInputRequired(d: AnalysisInputRequiredPayload) {
    // File : jamais de saisie, l'analyse ne doit pas s'arrêter (poids 0, à renseigner ensuite).
    if (this.mode === 'queue') {
      this.socket?.emit('analysis:input_response', { jobId: d.jobId, field: d.field, value: 0 });
      return;
    }
    const request = this.state.single.request;
    if (request?.skipWeight) {
      this.socket?.emit('analysis:input_response', { jobId: d.jobId, field: d.field, value: 0 });
      return;
    }
    this.setSingle({
      weight: {
        jobId: d.jobId,
        field: d.field,
        context: d.context ?? null,
        deadline: Date.now() + (d.timeoutMs ?? 600_000),
      },
    });
  }

  private handleCancelled() {
    this.clearStartTimer();
    this.jobId = null;
    if (this.mode === 'single' && this.state.single.phase !== 'cancelled') {
      this.setSingle({ phase: 'cancelled', weight: null });
    }
    // En mode file, l'annulation est déjà gérée par `stopQueue`.
  }

  private handleBlocked(d: BlockedData) {
    this.clearStartTimer();
    this.jobId = null;
    if (this.mode === 'queue') {
      this.failQueueItem(this.state.queue.currentIdx, d.message, true, 'blocked');
      return;
    }
    this.setSingle({ phase: 'blocked', blocked: d, weight: null });
  }

  private handleAlreadyAnalyzed(d: AlreadyAnalyzedData) {
    this.clearStartTimer();
    this.jobId = null;
    if (this.mode === 'queue') {
      this.failQueueItem(this.state.queue.currentIdx, 'Déjà analysé');
      return;
    }
    this.setSingle({ phase: 'already_analyzed', alreadyAnalyzed: d, weight: null });
  }

  private handleReused(d: AnalysisReusedData) {
    this.clearStartTimer();
    this.jobId = null;
    const ebatNotFound = d.reason === 'EBAT_NOT_FOUND_REUSED';
    if (this.mode === 'queue') {
      const idx = this.state.queue.currentIdx;
      const item = this.state.queue.items[idx];
      const elapsedMs = Date.now() - this.itemStartedAt;
      this.patchItem(idx, {
        status: ebatNotFound ? 'ebat_not_found' : 'done',
        stagingId: d.staging.uuid,
        elapsedMs,
      });
      if (item?.reserveUuid) void this.markDone(item.reserveUuid, d.staging.uuid);
      if (!ebatNotFound && item?.affaireId) this.assignAffaire(d.staging.uuid, item.affaireId, item.warehouse);
      this.advanceQueue(idx + 1);
      return;
    }
    const request = this.state.single.request;
    if (!ebatNotFound && request?.affaireId) {
      this.assignAffaire(d.staging.uuid, request.affaireId, request.warehouse);
    }
    this.invalidateStaging();
    this.setSingle({ phase: 'reused', reused: d, weight: null });
  }
}
