import type { HubSalesDailyPoint, HubSalesQuantities } from '@/types/product';

/**
 * Règles de l'historique des ventes d'un produit, portées de
 * `front_externe_batipower/lib/hub/product-sheet/sales.ts`. Fonctions pures : aucune dépendance
 * React ni réseau.
 */

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
] as const;

/** Ventes d'une période (jour, semaine ou mois), prête à être tracée ou listée. */
export interface SalesBucket {
  /** Identifiant stable : `YYYY-MM`, `YYYY-MM-DD` ou `S12 2026`. */
  key: string;
  /** Libellé court d'axe (« janv. », « 03/03 », « S12 »). */
  label: string;
  /** Libellé complet (« janv. 26 », « 3 mars 2026 », « Semaine 12 · 2026 »). */
  fullLabel: string;
  quantity: number;
  /** CA TTC ; absent quand le back ne l'envoie pas (MANAGER). */
  amount?: number;
  ordersCount: number;
  /** Mois ou période en cours (donc incomplet). */
  isCurrent?: boolean;
  /** M-1 à M-3 : mois qui nourrissent la prévision suggérée. */
  usedInSuggestion?: boolean;
}

export type SalesPeriod = 'week' | 'month' | '3months' | 'year';
export type SalesGranularity = 'day' | 'week' | 'month';

export const SALES_PERIODS: readonly { key: SalesPeriod; label: string }[] = [
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: '3months', label: '3 mois' },
  { key: 'year', label: 'Année' },
];

export const GRANULARITY_BY_PERIOD: Record<SalesPeriod, SalesGranularity> = {
  week: 'day',
  month: 'day',
  '3months': 'week',
  year: 'month',
};

const PERIOD_DAYS: Record<SalesPeriod, number> = {
  week: 7,
  month: 30,
  '3months': 90,
  year: 365,
};

const DAY_MS = 86_400_000;

function localMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** `YYYY-MM` → « janv. 26 ». */
export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const name = MONTHS_SHORT[Number(month) - 1] ?? monthKey;
  return `${name} ${(year ?? '').slice(2)}`.trim();
}

/** `YYYY-MM` → « janv. » (axe d'un histogramme mensuel). */
export function monthShortName(monthKey: string): string {
  return MONTHS_SHORT[Number(monthKey.split('-')[1]) - 1] ?? monthKey;
}

/** `YYYY-MM-DD` → « 03/03 ». */
function dayShort(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

/** `YYYY-MM-DD` → « 3 mars 2026 ». */
function dayFull(date: string): string {
  const [year, month, day] = date.split('-');
  return `${Number(day)} ${MONTHS_SHORT[Number(month) - 1] ?? ''} ${year}`;
}

/**
 * Ventes du mois M-`monthOffset`, lues dans `salesQuantities.monthly` (alimenté par un cron) avec
 * repli sur la somme de `salesQuantities.daily` pour ce mois.
 */
export function ventesDuMois(
  salesQuantities: HubSalesQuantities | null | undefined,
  monthOffset: number,
  now: Date = new Date(),
): number {
  if (!salesQuantities) return 0;
  const monthKey = localMonthKey(new Date(now.getFullYear(), now.getMonth() - monthOffset, 1));
  const monthly = salesQuantities.monthly ?? {};
  if (monthly[monthKey] !== undefined) return monthly[monthKey];
  let total = 0;
  for (const [key, value] of Object.entries(salesQuantities.daily ?? {})) {
    if (key.startsWith(monthKey)) total += Number(value || 0);
  }
  return total;
}

export interface MonthlySalesBreakdown {
  m: number;
  m1: number;
  m2: number;
  m3: number;
  /** Moyenne pondérée M-1×0,5 + M-2×0,3 + M-3×0,2, arrondie à l'entier. */
  previSuggere: number;
  /** Écart en % entre la prévision suggérée et la prévision enregistrée (0 sans prévision). */
  ecartPct: number;
}

export function monthlySalesBreakdown(
  salesQuantities: HubSalesQuantities | null | undefined,
  previSalesByMonth: number | null | undefined,
  now: Date = new Date(),
): MonthlySalesBreakdown {
  const m = ventesDuMois(salesQuantities, 0, now);
  const m1 = ventesDuMois(salesQuantities, 1, now);
  const m2 = ventesDuMois(salesQuantities, 2, now);
  const m3 = ventesDuMois(salesQuantities, 3, now);
  const previSuggere = Math.round(m1 * 0.5 + m2 * 0.3 + m3 * 0.2);
  const ecartPct =
    previSalesByMonth && previSalesByMonth > 0
      ? Math.round(((previSuggere - previSalesByMonth) / previSalesByMonth) * 100)
      : 0;
  return { m, m1, m2, m3, previSuggere, ecartPct };
}

/**
 * Série mensuelle de M-(months-1) à M. La quantité vient de `salesQuantities.monthly` en priorité
 * (même source que la suggestion), à défaut de la somme des points journaliers ; CA et commandes
 * viennent toujours des points journaliers.
 */
export function monthlySalesSeries(
  salesQuantities: HubSalesQuantities | null | undefined,
  dailyPoints: readonly HubSalesDailyPoint[],
  months = 12,
  now: Date = new Date(),
): SalesBucket[] {
  const fromDaily = new Map<
    string,
    { quantity: number; amount: number; ordersCount: number; hasAmount: boolean }
  >();
  for (const point of dailyPoints) {
    const key = point.date.slice(0, 7);
    const entry = fromDaily.get(key) ?? { quantity: 0, amount: 0, ordersCount: 0, hasAmount: false };
    entry.quantity += point.quantity;
    entry.ordersCount += point.ordersCount;
    if (point.amount != null) {
      entry.amount += point.amount;
      entry.hasAmount = true;
    }
    fromDaily.set(key, entry);
  }

  const monthly = salesQuantities?.monthly ?? {};
  const series: SalesBucket[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = localMonthKey(date);
    const daily = fromDaily.get(key);
    series.push({
      key,
      label: monthShortName(key),
      fullLabel: monthLabel(key),
      quantity: monthly[key] ?? daily?.quantity ?? 0,
      ...(daily?.hasAmount ? { amount: daily.amount } : {}),
      ordersCount: daily?.ordersCount ?? 0,
      isCurrent: offset === 0,
      usedInSuggestion: offset >= 1 && offset <= 3,
    });
  }
  return series;
}

function isoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 1 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/**
 * Regroupe les points journaliers par jour, semaine ISO ou mois calendaire, en ordre
 * chronologique. Le dernier groupe est marqué `isCurrent` (période en cours, donc incomplète).
 */
export function aggregateSalesPoints(
  points: readonly HubSalesDailyPoint[],
  granularity: SalesGranularity,
): SalesBucket[] {
  const buckets = new Map<string, { start: string; bucket: SalesBucket }>();
  for (const point of points) {
    let key: string;
    let label: string;
    let fullLabel: string;
    if (granularity === 'day') {
      key = point.date;
      label = dayShort(point.date);
      fullLabel = dayFull(point.date);
    } else if (granularity === 'week') {
      const { week, year } = isoWeek(new Date(`${point.date}T00:00:00Z`));
      key = `S${String(week).padStart(2, '0')} ${year}`;
      label = `S${String(week).padStart(2, '0')}`;
      fullLabel = `Semaine ${week} · ${year}`;
    } else {
      key = point.date.slice(0, 7);
      label = monthShortName(key);
      fullLabel = monthLabel(key);
    }

    const existing = buckets.get(key);
    if (existing) {
      existing.bucket.quantity += point.quantity;
      existing.bucket.ordersCount += point.ordersCount;
      if (point.amount != null) existing.bucket.amount = (existing.bucket.amount ?? 0) + point.amount;
      if (point.date < existing.start) existing.start = point.date;
    } else {
      buckets.set(key, {
        start: point.date,
        bucket: {
          key,
          label,
          fullLabel,
          quantity: point.quantity,
          ...(point.amount != null ? { amount: point.amount } : {}),
          ordersCount: point.ordersCount,
        },
      });
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => a.start.localeCompare(b.start));
  return sorted.map(({ bucket }, index) => ({ ...bucket, isCurrent: index === sorted.length - 1 }));
}

/** Découpe les points journaliers (365 j) selon la période affichée. */
export function sliceSalesByPeriod(
  points: readonly HubSalesDailyPoint[],
  period: SalesPeriod,
): HubSalesDailyPoint[] {
  return points.slice(-PERIOD_DAYS[period]);
}

/**
 * Complète une série journalière : un jour sans vente n'a pas de ligne en base. Sans ce
 * remplissage, l'histogramme « semaine » et « mois » omettrait les jours à zéro et fausserait la
 * lecture. Les points sont attendus triés par date.
 */
export function fillMissingDays(
  points: readonly HubSalesDailyPoint[],
  days: number,
  now: Date = new Date(),
): HubSalesDailyPoint[] {
  const byDate = new Map(points.map((point) => [point.date, point]));
  const filled: HubSalesDailyPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    filled.push(byDate.get(date) ?? { date, quantity: 0, ordersCount: 0 });
  }
  return filled;
}

/** Série d'une période de l'onglet Évolution : jours complétés, découpés puis regroupés. */
export function evolutionSeries(
  points: readonly HubSalesDailyPoint[],
  period: SalesPeriod,
  now: Date = new Date(),
): SalesBucket[] {
  const filled = fillMissingDays(points, PERIOD_DAYS[period], now);
  return aggregateSalesPoints(filled, GRANULARITY_BY_PERIOD[period]);
}

/** Vrai quand au moins un bucket porte un CA (SUPERADMIN) : sinon la colonne CA est masquée. */
export function hasAmounts(buckets: readonly SalesBucket[]): boolean {
  return buckets.some((bucket) => bucket.amount != null);
}

export function totalQuantity(buckets: readonly SalesBucket[]): number {
  return buckets.reduce((sum, bucket) => sum + bucket.quantity, 0);
}
