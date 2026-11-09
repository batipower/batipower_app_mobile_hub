import type {
  HubBrandMarginBrand,
  HubBrandMarginFigures,
  HubBrandMarginOverview,
  HubBrandMarginSavCause,
} from '@/types/hubBrandMargin';

export type MarginView = 'net' | 'gross';

export const ORIGIN_LABELS: Record<string, string> = {
  WEBSITE: 'Site',
  AMAZON: 'Amazon',
  MANOMANO: 'ManoMano',
  LEROY_MERLIN: 'Leroy Merlin',
  CASTORAMA: 'Castorama',
  CDISCOUNT: 'Cdiscount',
  BRICOMAN: 'Bricoman',
  UNKNOWN: 'Inconnue',
};

export const SAV_CAUSE_LABELS: Record<HubBrandMarginSavCause, string> = {
  BAD_TRANSPORT: 'Casse transport',
  TECHNICAL_FAILURE: 'Panne technique',
  CUSTOMER_RETURN: 'Retour client',
  FULL_LOSS: 'Perte totale',
  CARRIER_DISPUTE: 'Litige transporteur',
  HANDLING_RESTRICTION: 'Manutention (fragile / volumineux)',
  UNQUALIFIED: 'Non qualifié',
  RESEND: 'Renvois',
};

export function originLabel(origin: string): string {
  return ORIGIN_LABELS[origin] ?? origin;
}

export interface PeriodRange {
  from: string;
  to: string;
}

export type PeriodPresetId = 'thisMonth' | 'lastMonth' | '3m' | '6m' | '12m';

export const PERIOD_PRESETS: { id: PeriodPresetId; label: string }[] = [
  { id: 'thisMonth', label: 'Ce mois' },
  { id: 'lastMonth', label: 'Mois dernier' },
  { id: '3m', label: '3 mois' },
  { id: '6m', label: '6 mois' },
  { id: '12m', label: '12 mois' },
];

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Période d'un préréglage, en jours calendaires locaux (`YYYY-MM-DD`, bornes incluses). */
export function presetRange(id: PeriodPresetId, now: Date = new Date()): PeriodRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (id) {
    case 'thisMonth':
      return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) };
    case 'lastMonth':
      return {
        from: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    case '3m':
      return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 2, 1)), to: ymd(today) };
    case '6m':
      return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 5, 1)), to: ymd(today) };
    case '12m':
      return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 11, 1)), to: ymd(today) };
  }
}

export function activePreset(range: PeriodRange, now: Date = new Date()): PeriodPresetId | null {
  const found = PERIOD_PRESETS.find((preset) => {
    const candidate = presetRange(preset.id, now);
    return candidate.from === range.from && candidate.to === range.to;
  });
  return found?.id ?? null;
}

/** Période valide : dates renseignées, ordonnées et d'au plus 366 jours (limite de l'API). */
export function periodError(range: PeriodRange): string | null {
  if (!range.from || !range.to) return 'Renseignez une date de début et de fin.';
  const from = Date.parse(`${range.from}T00:00:00Z`);
  const to = Date.parse(`${range.to}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 'Dates invalides.';
  if (to < from) return 'La date de début doit précéder la date de fin.';
  if ((to - from) / 86_400_000 + 1 > 366) return 'Période limitée à 366 jours.';
  return null;
}

export function marginOf(
  figures: HubBrandMarginFigures,
  view: MarginView,
): { value: number; rate: number | null } {
  return view === 'net'
    ? { value: figures.netMarginHT, rate: figures.netMarginRate }
    : { value: figures.grossMarginHT, rate: figures.grossMarginRate };
}

/** Taux de marge actuel (prix de vente et d'achat en base) de la vue choisie, avec la couverture en pièces. */
export function currentRateOf(
  figures: HubBrandMarginFigures,
  view: MarginView,
): { rate: number | null; coveredUnits: number; units: number } | null {
  const current = figures.current;
  if (!current) return null;
  return {
    rate: view === 'net' ? current.netMarginRate : current.grossMarginRate,
    coveredUnits: current.coveredUnits,
    units: figures.units,
  };
}

/** Écart en points entre le taux actuel et le taux réalisé (`null` si l'un des deux manque). */
export function currentRateGap(figures: HubBrandMarginFigures, view: MarginView): number | null {
  const current = currentRateOf(figures, view);
  const realised = marginOf(figures, view).rate;
  return current?.rate != null && realised != null ? current.rate - realised : null;
}

export interface BrandMarginRow {
  brand: string;
  totals: HubBrandMarginFigures;
  byOrigin: ({ origin: string } & HubBrandMarginFigures)[];
}

/** Données de la vue d'ensemble restreintes à une marketplace (`null` = toutes). */
export function filterByOrigin(
  data: HubBrandMarginOverview,
  origin: string | null,
): { totals: HubBrandMarginFigures; rows: BrandMarginRow[] } {
  if (!origin) return { totals: data.totals, rows: data.brands };
  const totals = data.byOrigin.find((entry) => entry.origin === origin);
  const rows = data.brands.flatMap((brand: HubBrandMarginBrand) => {
    const entry = brand.byOrigin.find((item) => item.origin === origin);
    return entry ? [{ brand: brand.brand, totals: entry, byOrigin: [entry] }] : [];
  });
  rows.sort((a, b) => b.totals.caHT - a.totals.caHT);
  return { totals: totals ?? emptyFigures(), rows };
}

export function emptyFigures(): HubBrandMarginFigures {
  return {
    caHT: 0,
    purchasesHT: 0,
    transportHT: 0,
    commissionsHT: 0,
    quoteAdjustmentHT: 0,
    cancellationsHT: 0,
    grossMarginHT: 0,
    grossMarginRate: null,
    sav: { creditSlipsHT: 0, restockRecoveredHT: 0, resendCostHT: 0, totalHT: 0, byCause: {} },
    netMarginHT: 0,
    netMarginRate: null,
    current: null,
    units: 0,
    orders: 0,
  };
}

export type SortKey = 'caHT' | 'margin' | 'rate' | 'currentRate' | 'savImpact' | 'brand';

export function sortRows(
  rows: BrandMarginRow[],
  key: SortKey,
  desc: boolean,
  view: MarginView,
): BrandMarginRow[] {
  const value = (row: BrandMarginRow): number => {
    switch (key) {
      case 'caHT':
        return row.totals.caHT;
      case 'margin':
        return marginOf(row.totals, view).value;
      case 'rate':
        return marginOf(row.totals, view).rate ?? Number.NEGATIVE_INFINITY;
      case 'currentRate':
        return currentRateOf(row.totals, view)?.rate ?? Number.NEGATIVE_INFINITY;
      case 'savImpact':
        return row.totals.sav.totalHT;
      default:
        return 0;
    }
  };
  const sorted = [...rows].sort((a, b) =>
    key === 'brand' ? a.brand.localeCompare(b.brand, 'fr') : value(a) - value(b),
  );
  return desc ? sorted.reverse() : sorted;
}
