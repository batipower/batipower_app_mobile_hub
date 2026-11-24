import type { LiveAnalysis, LivePoste } from '@/api/hubAnalysesLive';
import { STEPS_DEF } from '@/features/product-analyzer/lib/constants';

/** Au-delà, le poste n'a plus battu depuis 3 battements (30 s) : à surveiller. */
export const POSTE_SLOW_MS = 90_000;
/** Seuil serveur (180 s) : au-delà, le serveur libère les lignes du poste. */
export const POSTE_LOST_MS = 180_000;

/** Ramène une étape émise par le back (`4_amazon`, `4_manomano`…) à une étape de `STEPS_DEF`. */
function normalizeStepKey(step: string | null | undefined): string | null {
  if (!step) return null;
  if (STEPS_DEF.some((s) => s.key === step)) return step;
  if (step.startsWith('4_')) return '4_start';
  return null;
}

function stepLabel(step: string | null | undefined): string {
  const key = normalizeStepKey(step);
  const def = key ? STEPS_DEF.find((s) => s.key === key) : null;
  return def?.label ?? (step ? `Étape ${step}` : 'Démarrage');
}

export type AnalysisProgress = {
  /** Position 1-based de l'étape courante, 0 avant la première étape. */
  position: number;
  total: number;
  label: string;
  percent: number;
};

export function analysisProgress(
  a: Pick<LiveAnalysis, 'currentStep' | 'currentStatus' | 'completedSteps'>,
): AnalysisProgress {
  const total = STEPS_DEF.length;
  const key = normalizeStepKey(a.currentStep);
  const idx = key ? STEPS_DEF.findIndex((s) => s.key === key) : -1;
  const finished = new Set(['done', 'completed', 'success', 'skipped', 'error', 'failed']);
  const currentDone = finished.has(String(a.currentStatus ?? '').toLowerCase());
  const doneCount = idx < 0 ? 0 : idx + (currentDone ? 1 : 0);

  return {
    position: idx < 0 ? 0 : idx + 1,
    total,
    label: stepLabel(a.currentStep),
    percent: Math.round((doneCount / total) * 100),
  };
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, '0')}`;
}

/** « il y a 20 s » ; « à l'instant » sous 5 s. */
export function formatAgo(iso: string | null | undefined, now: number): string {
  if (!iso) return 'jamais';
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return 'jamais';
  if (ms < 5_000) return "à l'instant";
  return `il y a ${formatDuration(ms)}`;
}

export type PosteHealth = 'ok' | 'slow' | 'lost';

/** Santé d'un poste qui détient des lignes : d'après son dernier signe de vie. */
export function posteHealth(
  poste: Pick<LivePoste, 'enCours' | 'lastSeenAt' | 'heartbeatAt'>,
  now: number,
): PosteHealth {
  if (poste.enCours === 0) return 'ok';
  const last = poste.heartbeatAt ?? poste.lastSeenAt;
  if (!last) return 'lost';
  const age = now - new Date(last).getTime();
  if (age > POSTE_LOST_MS) return 'lost';
  if (age > POSTE_SLOW_MS) return 'slow';
  return 'ok';
}

export type ReserveProgress = {
  done: number;
  total: number;
  percent: number;
  /** « 280 / 3299 » */
  fraction: string;
  /** Rang de la ligne en cours (« ligne 281 »), null si aucune analyse ne tourne. */
  position: number | null;
};

/** Avancement du poste sur sa sélection de réserve : « 280 / 3299 · 8 % ». */
export function reserveProgress(
  poste: Pick<LivePoste, 'done' | 'total' | 'currentPosition'>,
): ReserveProgress {
  const total = Math.max(poste.total, 0);
  const done = Math.min(Math.max(poste.done, 0), total);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, percent, fraction: `${done} / ${total}`, position: poste.currentPosition ?? null };
}

/** « 3 299 » : entier avec séparateur de milliers français. */
export function formatInt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

export function posteTitle(poste: Pick<LivePoste, 'identified' | 'user'>): string {
  if (!poste.identified) return 'Poste non identifié';
  return poste.user?.name || poste.user?.email || 'Poste inconnu';
}
