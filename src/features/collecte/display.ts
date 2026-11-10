import type { BadgeTone } from '@/components/ui/Badge';
import type {
  CollecteMinHours,
  CollecteWarehouse,
  LabelCarrierCheck,
  LabelPrintStatus,
  OrderLabel,
} from '@/types/hubCollecte';

export const COLLECTE_REFRESH_MS = 30_000;

export const DEFAULT_COLLECTE_WAREHOUSE: CollecteWarehouse = 'QG_BATIPOWER';

/** Seuil par défaut : même vue que l'indicateur de la barre du web (colis non collectés depuis plus de 24 h). */
export const DEFAULT_MIN_HOURS: CollecteMinHours = 24;

export const COLLECTE_WAREHOUSES: readonly { key: CollecteWarehouse; label: string }[] = [
  { key: 'QG_BATIPOWER', label: 'QG' },
  { key: 'DOMBASLE', label: 'Dombasle' },
  { key: 'FLEVY', label: 'Flévy' },
];

const WAREHOUSE_LABELS: Record<string, string> = {
  QG_BATIPOWER: 'QG Batipower',
  DOMBASLE: 'Dombasle',
  FLEVY: 'Flévy',
};

export function collecteWarehouseLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return WAREHOUSE_LABELS[code] ?? code;
}

export const MIN_HOURS_OPTIONS: readonly { value: CollecteMinHours; label: string }[] = [
  { value: 0, label: 'Tous' },
  { value: 24, label: '> 24 h' },
  { value: 48, label: '> 48 h' },
  { value: 72, label: '> 72 h' },
];

// ─── Ancienneté ──────────────────────────────────────────────────────────────

export type AgeTone = 'fresh' | 'over24' | 'over48' | 'over72';

/** Code couleur d'ancienneté, aligné sur l'indicateur du web (> 24 h, > 48 h, > 72 h). */
export function ageTone(ageHours: number): AgeTone {
  if (ageHours >= 72) return 'over72';
  if (ageHours >= 48) return 'over48';
  if (ageHours >= 24) return 'over24';
  return 'fresh';
}

export const AGE_BADGE_TONE: Record<AgeTone, BadgeTone> = {
  fresh: 'neutral',
  over24: 'amber',
  over48: 'amber',
  over72: 'red',
};

/** « 2 j 5 h » / « 30 h » / « 45 min » : ancienneté lisible d'un colis expédié. */
export function formatAge(ageHours: number): string {
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))} min`;
  if (ageHours < 48) return `${Math.floor(ageHours)} h`;
  const days = Math.floor(ageHours / 24);
  const hours = Math.floor(ageHours - days * 24);
  return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
}

/** « 12/11 14:30 » ; « — » si la date est absente. */
export function formatShortDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Étiquettes ──────────────────────────────────────────────────────────────

export const PRINT_STATUS_LABEL: Record<LabelPrintStatus, string> = {
  PRINTED: 'Imprimée',
  TO_PRINT: 'À imprimer',
  PDF: 'PDF de secours',
  UNKNOWN: 'Inconnue',
};

/** Avancement du contrôle transporteur d'une étiquette (file séquentielle). */
export type CarrierCheckEntry =
  | { status: 'queued' }
  | { status: 'running' }
  | { status: 'error' }
  | { status: 'done'; check: LabelCarrierCheck };

export type LabelCollectState =
  | 'POINTAGE'
  | 'CARRIER_COLLECTED'
  | 'CARRIER_DELIVERED'
  | 'CHECKING'
  | 'UNAVAILABLE'
  | 'UNSUPPORTED'
  | 'NOT_COLLECTED';

export const STATE_BADGE: Record<LabelCollectState, { text: string; tone: BadgeTone }> = {
  POINTAGE: { text: 'Collectée (pointage)', tone: 'green' },
  CARRIER_COLLECTED: { text: 'Collectée (transporteur)', tone: 'green' },
  CARRIER_DELIVERED: { text: 'Livrée (transporteur)', tone: 'blue' },
  CHECKING: { text: 'Contrôle en cours…', tone: 'neutral' },
  UNAVAILABLE: { text: 'Contrôle indisponible', tone: 'amber' },
  UNSUPPORTED: { text: 'Transporteur non contrôlable', tone: 'neutral' },
  NOT_COLLECTED: { text: 'Non collectée', tone: 'neutral' },
};

/** État d'une étiquette en croisant le pointage et le contrôle transporteur. */
export function labelCollectState(
  label: OrderLabel,
  entry: CarrierCheckEntry | undefined,
): LabelCollectState {
  if (label.collected) return 'POINTAGE';
  if (!entry) return 'NOT_COLLECTED';
  if (entry.status === 'queued' || entry.status === 'running') return 'CHECKING';
  if (entry.status === 'error') return 'UNAVAILABLE';
  switch (entry.check.state) {
    case 'DELIVERED':
      return 'CARRIER_DELIVERED';
    case 'COLLECTED':
      return 'CARRIER_COLLECTED';
    case 'UNAVAILABLE':
      return 'UNAVAILABLE';
    case 'UNSUPPORTED':
      return 'UNSUPPORTED';
    default:
      return 'NOT_COLLECTED';
  }
}

export function isCollectedState(state: LabelCollectState): boolean {
  return state === 'POINTAGE' || state === 'CARRIER_COLLECTED' || state === 'CARRIER_DELIVERED';
}

export type LabelsSummaryKind =
  | 'EMPTY'
  | 'CURRENT_COLLECTED'
  | 'VIA_HISTORY'
  | 'CHECKING'
  | 'UNKNOWN'
  | 'NONE_COLLECTED';

export type LabelsSummary = {
  kind: LabelsSummaryKind;
  total: number;
  collected: number;
  checked: number;
  /** Une étiquette est collectée selon le transporteur seul (aucun scan de pointage). */
  carrierEvidence: boolean;
};

/** Synthèse de l'historique avec les deux sources (pointages et transporteur). */
export function summarizeLabels(
  labels: readonly OrderLabel[],
  entries: Record<string, CarrierCheckEntry | undefined>,
): LabelsSummary {
  const states = labels.map((label) => ({
    label,
    state: labelCollectState(label, entries[label.trackingNumber]),
  }));
  const collected = states.filter((item) => isCollectedState(item.state)).length;
  const checking = states.filter((item) => item.state === 'CHECKING').length;
  const unknown = states.filter(
    (item) => item.state === 'UNAVAILABLE' || item.state === 'UNSUPPORTED',
  ).length;
  const carrierEvidence = states.some(
    (item) => item.state === 'CARRIER_COLLECTED' || item.state === 'CARRIER_DELIVERED',
  );
  const base = {
    total: labels.length,
    collected,
    checked: labels.length - checking,
    carrierEvidence,
  };

  if (labels.length === 0) return { ...base, kind: 'EMPTY' };
  if (states.some((item) => item.label.isCurrent && isCollectedState(item.state))) {
    return { ...base, kind: 'CURRENT_COLLECTED' };
  }
  if (collected > 0) return { ...base, kind: 'VIA_HISTORY' };
  if (checking > 0) return { ...base, kind: 'CHECKING' };
  if (unknown > 0) return { ...base, kind: 'UNKNOWN' };
  return { ...base, kind: 'NONE_COLLECTED' };
}
