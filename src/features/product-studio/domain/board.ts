import type { StudioFacets, StudioJob, StudioProductHistory, StudioReviewItem } from '@/types/hubStudioJobs';

/** Les échecs et partiels plus vieux que cette durée ne sont plus remontés dans « À traiter ». */
export const ATTENTION_WINDOW_MS = 7 * 24 * 3600 * 1000;
/** Une préparation terminée reste affichée en carte provisoire ce temps-là si la relecture n'est pas encore arrivée. */
export const PROVISIONAL_WINDOW_MS = 3 * 60 * 1000;
/** Nombre de produits affichés dans « Terminées ». */
export const DONE_LIMIT = 30;

export type TodoEntry =
  | { kind: 'review'; key: string; item: StudioReviewItem; failure: StudioJob | null; prepareJobId: string | null; activeJob: StudioJob | null }
  | { kind: 'deploying'; key: string; job: StudioJob }
  | { kind: 'failure'; key: string; job: StudioJob }
  | { kind: 'provisional'; key: string; job: StudioJob };

/** Un produit dans « Terminées » : son dernier job, le nombre de passages et son dernier déploiement réussi. */
export interface DoneEntry {
  reference: string;
  job: StudioJob;
  runs: number;
  lastDeployedAt: string | null;
}

export interface ProductBoard {
  queued: StudioJob[];
  running: StudioJob[];
  toProcess: TodoEntry[];
  done: DoneEntry[];
}

export interface ProductBoardInput {
  running: StudioJob[];
  queued: StudioJob[];
  /** Jobs terminés, du plus récent au plus ancien. */
  history: StudioJob[];
  /** Historique regroupé par produit (back récent) ; absent : il est déduit de `history`. */
  products?: StudioProductHistory[];
  reviewItems: StudioReviewItem[];
  /** Horloge « arrondie » (10 s) : les cartes provisoires expirent sans recalcul à chaque seconde. */
  nowBucket: number;
  /** Horloge exacte, uniquement pour la fenêtre de 7 jours des échecs. */
  now: number;
  matchesRequester: (email: string | null | undefined) => boolean;
  /** Filtres marque, service, affaire et stock, appliqués à la fiche ou au job (absent : tout passe). */
  matchesFacets?: (source: StudioFacets) => boolean;
  /** Nombre maximal de produits dans « Terminées » (défaut : {@link DONE_LIMIT}). */
  doneLimit?: number;
}

/**
 * Préparation « partielle » parce que le contrôle avant déploiement a trouvé des points à corriger :
 * la carte les détaille déjà (badge, liste), ce n'est donc pas un échec à « reprendre ».
 */
export function isPreflightOnlyFailure(job: Pick<StudioJob, 'type' | 'status' | 'result'>): boolean {
  return job.type === 'PREPARE' && job.status === 'PARTIAL' && Boolean(job.result?.preflight);
}

export const isActiveEntry = (entry: TodoEntry) => entry.kind === 'deploying' || (entry.kind === 'review' && entry.activeJob !== null);

const time = (iso: string | null | undefined) => new Date(iso ?? 0).getTime();

/** Regroupe l'historique par produit : dernier job, nombre de passages, dernier déploiement réussi. */
export function groupHistoryByProduct(history: StudioJob[]): StudioProductHistory[] {
  const byRef = new Map<string, StudioProductHistory>();
  for (const job of history) {
    const existing = byRef.get(job.reference);
    if (!existing) {
      byRef.set(job.reference, { job, runs: 1, lastDeployedAt: null });
    } else {
      existing.runs += 1;
    }
    if (job.type === 'DEPLOY' && job.status === 'DONE') {
      const entry = byRef.get(job.reference)!;
      const finished = job.finishedAt ?? job.createdAt;
      if (!entry.lastDeployedAt || time(finished) > time(entry.lastDeployedAt)) entry.lastDeployedAt = finished;
    }
  }
  return [...byRef.values()];
}

/**
 * Construit le tableau en raisonnant par produit : chaque référence apparaît dans une seule colonne,
 * dans l'ordre de priorité « À traiter » > « En cours » > « En attente » > « Terminées ».
 */
export function buildProductBoard(input: ProductBoardInput): ProductBoard {
  const { running: allRunning, queued: allQueued, history, products, reviewItems, nowBucket, now } = input;
  const matchesFacets = input.matchesFacets ?? (() => true);
  const doneLimit = input.doneLimit ?? DONE_LIMIT;
  /** Demandeur + marque, service, affaire, stock : une fiche ou un job doit passer les deux. */
  const matches = (source: StudioFacets & { requestedByEmail: string | null }) =>
    input.matchesRequester(source.requestedByEmail) && matchesFacets(source);

  const reviewRefs = new Set(reviewItems.map((i) => i.reference));
  /** Un déploiement, ou un traitement sur une fiche déjà dans « À traiter », s'affiche sur sa carte. */
  const isInlineJob = (job: StudioJob) => job.type === 'DEPLOY' || reviewRefs.has(job.reference);

  /** Job actif par référence (en cours avant en file) : sert à la progression sur place. */
  const activeJobByRef = new Map<string, StudioJob>();
  for (const job of [...allRunning, ...allQueued]) if (!activeJobByRef.has(job.reference)) activeJobByRef.set(job.reference, job);
  const activeRefs = new Set(activeJobByRef.keys());

  /** Dernier job de préparation terminé par référence (l'historique est trié du plus récent au plus ancien). */
  const prepareJobByRef = new Map<string, StudioJob>();
  /** Job le plus récent de chaque référence. */
  const latestJobByRef = new Map<string, StudioJob>();
  for (const job of history) {
    if (!latestJobByRef.has(job.reference)) latestJobByRef.set(job.reference, job);
    if (job.type === 'PREPARE' && job.status === 'DONE' && !prepareJobByRef.has(job.reference)) prepareJobByRef.set(job.reference, job);
  }

  /** Dernier échec ou partiel récent par référence, tant qu'il n'a pas été rattrapé par une réussite plus récente. */
  const failureByRef = new Map<string, StudioJob>();
  const failureLimit = now - ATTENTION_WINDOW_MS;
  for (const job of history) {
    if (job.status !== 'FAILED' && job.status !== 'PARTIAL') continue;
    if (failureByRef.has(job.reference) || activeRefs.has(job.reference)) continue;
    if (time(job.finishedAt ?? job.createdAt) < failureLimit) continue;
    const created = time(job.createdAt);
    const superseded = history.some((other) => other.reference === job.reference && other.status === 'DONE' && time(other.createdAt) > created);
    if (!superseded) failureByRef.set(job.reference, job);
  }

  // ─── « À traiter » : une seule carte par référence ───
  const entries: TodoEntry[] = [];
  const seen = new Set<string>();
  for (const item of reviewItems) {
    if (seen.has(item.reference) || !matches(item)) continue;
    // Déploiement tout juste terminé alors que la relecture n'est pas encore rechargée : la fiche part vers « Terminées ».
    const latest = latestJobByRef.get(item.reference);
    if (latest?.type === 'DEPLOY' && latest.status === 'DONE' && !activeJobByRef.has(item.reference)) {
      const since = time(item.appliedAt ?? item.preparedAt);
      if (time(latest.finishedAt ?? latest.createdAt) >= since) continue;
    }
    seen.add(item.reference);
    entries.push({
      kind: 'review',
      key: `${item.reference}:${item.stage}`,
      item,
      failure: ((f) => (f && isPreflightOnlyFailure(f) ? null : f))(failureByRef.get(item.reference)) ?? null,
      prepareJobId: prepareJobByRef.get(item.reference)?.id ?? null,
      activeJob: activeJobByRef.get(item.reference) ?? null,
    });
  }
  // Déploiement actif dont la fiche n'est plus dans la relecture : la carte reste là jusqu'à la fin du job.
  for (const [reference, job] of activeJobByRef) {
    if (seen.has(reference) || job.type !== 'DEPLOY' || !matches(job)) continue;
    seen.add(reference);
    entries.unshift({ kind: 'deploying', key: `deploying:${job.id}`, job });
  }
  for (const [reference, job] of failureByRef) {
    if (seen.has(reference) || !matches(job)) continue;
    seen.add(reference);
    entries.push({ kind: 'failure', key: `failure:${job.id}`, job });
  }
  const windowStart = nowBucket * 10_000 - PROVISIONAL_WINDOW_MS;
  for (const [reference, job] of prepareJobByRef) {
    if (seen.has(reference) || activeRefs.has(reference) || !matches(job)) continue;
    if (latestJobByRef.get(reference)?.id !== job.id) continue;
    if (time(job.finishedAt ?? job.createdAt) < windowStart) continue;
    seen.add(reference);
    entries.push({ kind: 'provisional', key: `provisional:${job.id}`, job });
  }
  // Les cartes en cours de traitement passent en tête, sans changer l'ordre du reste.
  const toProcess = [...entries.filter(isActiveEntry), ...entries.filter((entry) => !isActiveEntry(entry))];

  // ─── « En cours » puis « En attente » : une carte par produit, jamais déjà présent plus à gauche ───
  const placed = new Set(seen);
  const pickPreparations = (jobs: StudioJob[]) => {
    const picked: StudioJob[] = [];
    for (const job of jobs) {
      if (isInlineJob(job) || !matches(job) || placed.has(job.reference)) continue;
      placed.add(job.reference);
      picked.push(job);
    }
    return picked;
  };
  const running = pickPreparations(allRunning);
  const queued = pickPreparations(allQueued);

  // ─── « Terminées » : un produit = une carte, d'après son dernier job ───
  const done: DoneEntry[] = [];
  for (const product of products ?? groupHistoryByProduct(history)) {
    const { job } = product;
    const reference = job.reference;
    if (placed.has(reference) || activeRefs.has(reference)) continue;
    if (!((job.status === 'DONE' && job.type === 'DEPLOY') || job.status === 'CANCELLED')) continue;
    if (!matches(job)) continue;
    placed.add(reference);
    done.push({ reference, job, runs: product.runs, lastDeployedAt: product.lastDeployedAt });
    if (done.length >= doneLimit) break;
  }

  return { queued, running, toProcess, done };
}
