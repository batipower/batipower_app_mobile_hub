import type { Theme } from '@/theme';
import type { PrintServerStatus } from '@/types/hubSupervision';

/** Rafraîchissement automatique de la vue d'ensemble (comme la page web). */
export const PRINT_OVERVIEW_REFRESH_MS = 15_000;

/** Fenêtre des statistiques servant au compteur « auj. » de chaque entrepôt. */
export const PRINT_STATS_DAYS = 14;

/** Délai avant de relire l'état d'un poste après un envoi d'étiquette (le poste scanne toutes les 5 s). */
export const PRINT_REFRESH_AFTER_TEST_MS = 8_000;

export type StatusTone = 'ok' | 'warning' | 'alert' | 'muted';

export const STATUS_META: Record<PrintServerStatus, { label: string; tone: StatusTone }> = {
  ONLINE: { label: 'En ligne', tone: 'ok' },
  OFFLINE: { label: 'Hors ligne', tone: 'alert' },
  DUPLICATE_INSTANCE: { label: 'Instance en double', tone: 'alert' },
  STALLED: { label: 'Bloqué', tone: 'alert' },
  PRINTER_UNREACHABLE: { label: 'Imprimante injoignable', tone: 'warning' },
  BACKLOG: { label: 'Étiquettes en retard', tone: 'warning' },
  DISABLED: { label: 'Désactivé', tone: 'muted' },
};

export const PRINT_MODE_LABELS: Record<string, string> = {
  network: 'Réseau (TCP)',
  spooler: 'Spouleur Windows',
  cups: 'CUPS',
};

export const SERVICE_LABELS: Record<string, string> = {
  CLASSIC: 'Classic',
  PREDICT: 'Predict',
  RELAIS: 'Relais',
  STANDARD: 'Standard',
};

/** Couleur du thème d'une teinte de statut. */
export function toneColor(t: Pick<Theme, 'success' | 'warning' | 'danger' | 'neutral'>, tone: StatusTone): string {
  switch (tone) {
    case 'ok':
      return t.success;
    case 'warning':
      return t.warning;
    case 'alert':
      return t.danger;
    default:
      return t.neutral;
  }
}

/** Durée lisible : « 12 s », « 3 min », « 3 h 05 », « 2 j 4 h ». */
export function formatDuration(totalSec: number, prefix = ''): string {
  if (totalSec < 60) return `${prefix}${totalSec} s`;
  const minutes = Math.floor(totalSec / 60);
  if (minutes < 60) return `${prefix}${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${prefix}${hours} h ${String(minutes % 60).padStart(2, '0')}`;
  const days = Math.floor(hours / 24);
  return `${prefix}${days} j ${hours % 24} h`;
}

/** Durée écoulée depuis `iso` : « il y a 12 s » ; « jamais » sans date. */
export function formatAgo(iso: string | null, nowMs: number = Date.now()): string {
  if (!iso) return 'jamais';
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  return formatDuration(diffSec, 'il y a ');
}
