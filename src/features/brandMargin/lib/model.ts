import type {
  HubBrandMarginBrand,
  HubBrandMarginFigures,
  HubBrandMarginOverview,
  HubBrandMarginSavCause,
  HubBrandMarginSiteFigures,
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

/** Causes d'impact SAV regroupées par colonne (reprise de `SAV_CAUSE_GROUPS` du web). */
export const SAV_CAUSE_GROUPS: readonly {
  id: string;
  label: string;
  /** Libellé court (en-tête de colonne, pastille). */
  short: string;
  causes: readonly HubBrandMarginSavCause[];
  title: string;
}[] = [
  { id: 'transport', label: 'Casse transport', short: 'Casse', causes: ['BAD_TRANSPORT'], title: 'Retours reçus cassés par le transport' },
  { id: 'technical', label: 'Panne technique', short: 'Panne', causes: ['TECHNICAL_FAILURE'], title: 'Retours reçus cassés (panne technique)' },
  { id: 'dispute', label: 'Litige', short: 'Litige', causes: ['CARRIER_DISPUTE'], title: 'Litiges transporteur' },
  { id: 'loss', label: 'Perte totale', short: 'Perte', causes: ['FULL_LOSS'], title: 'Remboursements sans retour' },
  {
    id: 'handling',
    label: 'Manutention',
    short: 'Manut.',
    causes: ['HANDLING_RESTRICTION'],
    title: 'Annulations de produits trop fragiles ou trop volumineux',
  },
  { id: 'resend', label: 'Renvois', short: 'Renvois', causes: ['RESEND'], title: 'Coût des renvois (achats + transport)' },
  {
    id: 'customerReturn',
    label: 'Retour client',
    short: 'Retour',
    causes: ['CUSTOMER_RETURN'],
    title:
      'Retours client reçus cassés ou invendables, sans cause « casse transport » ni « panne technique » renseignée',
  },
  {
    id: 'unqualified',
    label: 'Non qualifié',
    short: 'À qualifier',
    causes: ['UNQUALIFIED'],
    title: 'Avoirs sans aucune trace dans le HUB : cause à qualifier',
  },
];

/** Montant d'une cause groupée (somme de ses causes) ; 0 quand rien. */
export function savGroupAmount(
  figures: Pick<HubBrandMarginFigures, 'sav'>,
  group: (typeof SAV_CAUSE_GROUPS)[number],
): number {
  return group.causes.reduce((sum, cause) => sum + (figures.sav.byCause[cause] ?? 0), 0);
}

/** Taux d'un montant en % du CA HT ; `null` sans CA. */
export function rateOfCa(amount: number, caHT: number): number | null {
  return caHT > 0 ? (amount / caHT) * 100 : null;
}

/** Causes de SAV non nulles d'un périmètre, par montant décroissant. */
export function savCauseEntries(
  figures: Pick<HubBrandMarginFigures, 'sav'>,
): [HubBrandMarginSavCause, number][] {
  return (Object.entries(figures.sav.byCause) as [HubBrandMarginSavCause, number][])
    .filter(([, amount]) => Math.abs(amount) >= 0.005)
    .sort((a, b) => b[1] - a[1]);
}

export function originLabel(origin: string): string {
  return ORIGIN_LABELS[origin] ?? origin;
}

export interface PeriodRange {
  from: string;
  to: string;
}

export type PeriodPresetId =
  | 'month'
  | 'prevMonth'
  | 'last3m'
  | 'last12m'
  | 'ytd'
  | 'prevYear'
  | 'custom';

/** Périodes du web (`BRAND_MARGIN_PERIOD_PRESETS`) : libellé complet et libellé court des puces. */
export const PERIOD_PRESETS: { id: PeriodPresetId; label: string; short: string }[] = [
  { id: 'month', label: 'Mois en cours', short: 'Ce mois' },
  { id: 'prevMonth', label: 'Mois précédent', short: 'Mois -1' },
  { id: 'last3m', label: '3 derniers mois', short: '3 mois' },
  { id: 'last12m', label: '12 derniers mois', short: '12 mois' },
  { id: 'ytd', label: 'Année en cours', short: 'Année' },
  { id: 'prevYear', label: 'Année précédente', short: 'Année -1' },
  { id: 'custom', label: 'Dates personnalisées', short: 'Dates' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
}

export function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Date locale d'un `YYYY-MM-DD` (minuit local). */
export function parseYmd(value: string): Date {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Période d'un préréglage, en jours calendaires locaux (`YYYY-MM-DD`, bornes incluses). `custom`
 * utilise les dates fournies (repli : aujourd'hui), remises dans l'ordre.
 */
export function presetRange(
  id: PeriodPresetId,
  now: Date = new Date(),
  custom?: { from: string; to: string },
): PeriodRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = (back: number) => ymd(new Date(today.getFullYear(), today.getMonth() - back, 1));
  switch (id) {
    case 'month':
      return { from: startOfMonth(0), to: ymd(today) };
    case 'prevMonth':
      return {
        from: startOfMonth(1),
        to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    case 'last3m':
      return { from: startOfMonth(2), to: ymd(today) };
    case 'last12m':
      return { from: startOfMonth(11), to: ymd(today) };
    case 'ytd':
      return { from: `${today.getFullYear()}-01-01`, to: ymd(today) };
    case 'prevYear':
      return { from: `${today.getFullYear() - 1}-01-01`, to: `${today.getFullYear() - 1}-12-31` };
    case 'custom': {
      const from = isIsoDate(custom?.from) ? custom.from : ymd(today);
      const to = isIsoDate(custom?.to) ? custom.to : ymd(today);
      return from <= to ? { from, to } : { from: to, to: from };
    }
  }
}

/** Libellé court de la période (puce de la liste). */
export function periodShortLabel(id: PeriodPresetId): string {
  return PERIOD_PRESETS.find((preset) => preset.id === id)?.short ?? 'Période';
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
  /** Marge catalogue du site (marque entière). */
  site?: HubBrandMarginSiteFigures | null;
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
    return entry ? [{ brand: brand.brand, totals: entry, byOrigin: [entry], site: brand.site }] : [];
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

export type SortKey = 'caHT' | 'margin' | 'rate' | 'siteRate' | 'savImpact' | 'brand';

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
      case 'siteRate':
        return row.site?.marginRate ?? Number.NEGATIVE_INFINITY;
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
