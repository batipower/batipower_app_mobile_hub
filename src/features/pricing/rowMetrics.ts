import type { HubPricingRow, PricingMarketplaceKey } from '@/types/hubPricing';

/** TVA par pays de livraison (`getVatRate` du web). */
const VAT_RATES: Record<string, number> = { FR: 1.2, BE: 1.21, ES: 1.21, IT: 1.22, DE: 1.19 };

export function vatRate(country: string): number {
  return VAT_RATES[country] ?? 1.2;
}

/** Commission par défaut d'une marketplace (`MARKETPLACE_COMMISSION` du web). */
const COMMISSION: Record<PricingMarketplaceKey, number> = {
  amazon: 0.15,
  manoMano: 0.13,
  leroyMerlin: 0.12,
  castorama: 0.12,
  bricoman: 0.12,
  cdiscount: 0.15,
};

/** Coût transporteur HT pour un pays (valeur unique ou table par pays). */
export function resolveCarrierCostHT(
  value: number | Record<string, number> | null | undefined,
  country: string,
): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (country in value) return value[country] ?? null;
  if ('FR' in value) return value.FR ?? null;
  const first = Object.values(value)[0];
  return first ?? null;
}

/** Valeur numérique d'un prix BuyBox (`actual` peut être une chaîne ou un nombre). */
export function parseNumericActual(actual: number | string | null): number | null {
  if (actual == null) return null;
  if (typeof actual === 'number') return Number.isFinite(actual) ? actual : null;
  const parsed = Number(
    String(actual)
      .replace(',', '.')
      .replace(/[^\d.-]/g, ''),
  );
  return Number.isFinite(parsed) ? parsed : null;
}

export interface Margin {
  marginEur: number;
  marginPercent: number;
  pvHT: number;
}

/** Marge du site (`computeWebsiteMargin` du web) : PV HT − PA HT, sans commission. */
export function websiteMargin(row: HubPricingRow, country: string): Margin | null {
  const ttc = row.website.priceTTC;
  const pa = row.fixPriceHT;
  if (ttc == null || !Number.isFinite(ttc) || ttc <= 0) return null;
  if (pa == null || !Number.isFinite(pa) || pa <= 0) return null;
  const pvHT = ttc / vatRate(country);
  if (!Number.isFinite(pvHT) || pvHT <= 0) return null;
  const marginEur = pvHT - pa;
  return { marginEur, marginPercent: (marginEur / pvHT) * 100, pvHT };
}

/**
 * Marge nette d'une BuyBox détenue (`computeBuyboxMargin` du web) :
 * PV HT × (1 − commission) − PA HT − transport HT.
 */
export function buyboxMargin(
  row: HubPricingRow,
  marketplace: PricingMarketplaceKey,
  priceTTC: number,
  country: string,
): Margin | null {
  const pa = row.fixPriceHT;
  if (!Number.isFinite(priceTTC) || priceTTC <= 0) return null;
  if (pa == null || !Number.isFinite(pa) || pa <= 0) return null;
  // Amazon et ManoMano suivent le pays affiché ; les autres marketplaces sont FR.
  const mpCountry = marketplace === 'amazon' || marketplace === 'manoMano' ? country : 'FR';
  const destination = mpCountry in VAT_RATES ? mpCountry : 'FR';
  const pvHT = priceTTC / vatRate(destination);
  if (!Number.isFinite(pvHT) || pvHT <= 0) return null;
  const transport = resolveCarrierCostHT(row.transport.costCarrierHT, destination) ?? 0;
  const rate = row.marketplaces[marketplace].rentabilityRate;
  const commission =
    rate != null && Number.isFinite(rate) && rate >= 0 ? rate / 100 : COMMISSION[marketplace];
  const marginEur = pvHT * (1 - commission) - pa - transport;
  return { marginEur, marginPercent: (marginEur / pvHT) * 100, pvHT };
}

/** Clé `YYYY-MM` du mois courant décalé de `offset` mois en arrière. */
export function monthKey(offset: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Quantités vendues du mois (0 = mois en cours), pour un pays ou tous pays (`calcVentesMois`). */
export function salesOfMonth(row: HubPricingRow, offset: number, country?: string): number {
  const key = monthKey(offset);
  const monthly = country
    ? (row.potential.monthlyByCountry?.[country] ?? {})
    : (row.potential.monthly ?? {});
  if (monthly[key] !== undefined) return monthly[key] ?? 0;
  const daily = country
    ? (row.potential.dailyByCountry?.[country] ?? {})
    : (row.potential.daily ?? {});
  let total = 0;
  for (const day of Object.keys(daily)) {
    if (day.startsWith(key)) total += Number(daily[day] || 0);
  }
  return total;
}

/** Retours du mois (0 = mois en cours). */
export function returnsOfMonth(row: HubPricingRow, offset: number): number {
  return Number(row.returns?.monthly?.[monthKey(offset)]) || 0;
}

const MONTH_LABELS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Jun',
  'Jui',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

export interface MonthPoint {
  key: string;
  label: string;
  value: number;
}

/** Série M-6 → M (7 mois) des ventes, pour un pays ou tous pays. */
export function salesSeries(row: HubPricingRow, country?: string): MonthPoint[] {
  return buildSeries((offset) => salesOfMonth(row, offset, country));
}

/** Série M-6 → M (7 mois) des retours. */
export function returnsSeries(row: HubPricingRow): MonthPoint[] {
  return buildSeries((offset) => returnsOfMonth(row, offset));
}

function buildSeries(valueAt: (offset: number) => number): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    points.push({
      key: monthKey(offset),
      label: `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
      value: valueAt(offset),
    });
  }
  return points;
}

/** Surveillance BuyBox du pays (Amazon) : repli sur `monitorBuyBox` pour la France. */
export function isMonitoredForCountry(row: HubPricingRow, country: string): boolean {
  if (row.monitorBuyBoxByCountry && country in row.monitorBuyBoxByCountry) {
    return row.monitorBuyBoxByCountry[country] === true;
  }
  return country === 'FR' ? row.monitorBuyBox === true : false;
}

/** Bascule de la surveillance Amazon d'un pays (payload du PATCH). */
export function toggleMonitorPayload(row: HubPricingRow, country: string) {
  const next = { ...(row.monitorBuyBoxByCountry ?? {}) };
  const current = isMonitoredForCountry(row, country);
  next[country] = !current;
  return {
    ...(country === 'FR' ? { monitorBuyBox: !current } : {}),
    monitorBuyBoxByCountry: next,
  };
}

/** Surveillance ManoMano du pays : la France suit `monitorBuyBox`. */
export function isManoMonitoredForCountry(row: HubPricingRow, country: string): boolean {
  if (country === 'FR') return row.monitorBuyBox === true;
  return row.monitorBuyBoxManoManoByCountry?.[country] === true;
}

export function toggleManoMonitorPayload(row: HubPricingRow, country: string) {
  const next = { ...(row.monitorBuyBoxManoManoByCountry ?? {}) };
  next[country] = !next[country];
  return { monitorBuyBoxManoManoByCountry: next };
}
