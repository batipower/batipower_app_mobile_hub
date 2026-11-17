import type { StudioJob, StudioJobStatus, StudioJobStep, StudioJobType } from '@/types/hubStudioJobs';

export const isStudioJobActive = (job: Pick<StudioJob, 'status'> | null | undefined): boolean =>
  job?.status === 'QUEUED' || job?.status === 'RUNNING';

export const STUDIO_JOB_TYPE_LABEL: Record<StudioJobType, string> = {
  PREPARE: 'Préparation de la fiche',
  DEPLOY: 'Validation et déploiement',
};

export const STUDIO_JOB_STATUS_LABEL: Record<StudioJobStatus, string> = {
  QUEUED: 'En file',
  RUNNING: 'En cours',
  DONE: 'Terminé',
  PARTIAL: 'Terminé, à vérifier',
  FAILED: 'Échec',
  CANCELLED: 'Annulé',
};

export type StudioJobTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const STUDIO_JOB_STATUS_TONE: Record<StudioJobStatus, StudioJobTone> = {
  QUEUED: 'neutral',
  RUNNING: 'info',
  DONE: 'success',
  PARTIAL: 'warning',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};

/** Avancement des étapes d'un job sous forme `clé -> statut` (même forme que l'ancien socket). */
export function studioJobStepMap(job: StudioJob | null): Record<string, string> {
  return Object.fromEntries((job?.steps ?? []).map((step: StudioJobStep) => [step.key, step.status]));
}

/** Durée entre deux dates ISO (ou jusqu'à maintenant), formatée « 2 min 05 s ». */
export function formatJobDuration(from: string | null | undefined, to?: string | null, now: number = Date.now()): string {
  if (!from) return '—';
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : now;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '—';
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return `${minutes} min ${String(rest).padStart(2, '0')} s`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

export function formatJobDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * Notification de la cloche : une préparation réussie (ou « partielle » pour le seul contrôle préalable) est une fiche
 * à relire, pas un simple « Terminé ». Les autres cas gardent le libellé du statut.
 */
export function isStudioReviewNotification(job: Pick<StudioJob, 'type' | 'status' | 'result'>): boolean {
  if (job.type !== 'PREPARE') return false;
  return job.status === 'DONE' || (job.status === 'PARTIAL' && Boolean(job.result?.preflight));
}

export function studioNotificationLabel(job: Pick<StudioJob, 'type' | 'status' | 'result'>): string {
  return isStudioReviewNotification(job) ? 'À relire' : STUDIO_JOB_STATUS_LABEL[job.status];
}

export function studioNotificationTone(job: Pick<StudioJob, 'type' | 'status' | 'result'>): StudioJobTone {
  return isStudioReviewNotification(job) ? 'info' : STUDIO_JOB_STATUS_TONE[job.status];
}

/** Phrase courte affichée dans la cloche et le badge de la fiche. */
export function studioJobSummary(job: StudioJob): string {
  const base = STUDIO_JOB_TYPE_LABEL[job.type];
  if (job.status === 'QUEUED') return `${base} : en file${job.queuePosition ? ` (position ${job.queuePosition})` : ''}`;
  if (job.status === 'RUNNING') {
    const steps = job.steps ?? [];
    const done = steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;
    const current = steps.find((s) => s.status === 'running');
    return `${base} : étape ${Math.min(done + 1, steps.length || 1)}/${steps.length || 1}${current ? ` · ${current.label}` : ''}`;
  }
  return `${base} : ${STUDIO_JOB_STATUS_LABEL[job.status].toLowerCase()}`;
}
