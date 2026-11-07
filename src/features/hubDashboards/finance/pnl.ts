import type {
  FinanceAnomaly,
  FinancePnlMonthResponse,
  PnlEstimatedBasis,
  PnlLine,
} from '@/types/hubFinance';

/** Écart relatif du CA (en %) au-delà duquel un mois est signalé en écart (`REVENUE_GAP_ALERT_PCT` du web). */
const REVENUE_GAP_ALERT_PCT = 2;

export const SHORT_MONTHS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
] as const;

export type PnlMonthStatus = 'in_progress' | 'not_entered' | 'gap' | 'ok';

export const PNL_STATUS_LABELS: Record<PnlMonthStatus, string> = {
  in_progress: 'En cours',
  not_entered: 'Non saisi',
  gap: 'Écart',
  ok: 'Conforme',
};

export const BASIS_LABELS: Record<PnlEstimatedBasis, string> = {
  month: 'Charges saisies du mois',
  average3: 'Moyenne des mois clos précédents',
  none: 'Aucune donnée de charges',
};

export function revenueLine(data: FinancePnlMonthResponse): PnlLine | undefined {
  return data.lines.find((line) => line.id === 'revenue');
}

/** Statut d'un mois : en cours, charges non saisies dans Teogest, écart de CA au-dessus du seuil, ou conforme. */
export function monthStatus(data: FinancePnlMonthResponse): PnlMonthStatus {
  if (data.isCurrentMonth) return 'in_progress';
  if (data.result.estimatedBasis !== 'month') return 'not_entered';
  const line = revenueLine(data);
  const gapPct = line?.gapPct;
  if (gapPct === null || gapPct === undefined) return (line?.gapCents ?? 0) === 0 ? 'ok' : 'gap';
  return Math.abs(gapPct) > REVENUE_GAP_ALERT_PCT ? 'gap' : 'ok';
}

export interface PnlTotals {
  loadedMonths: number;
  expectedMonths: number;
  revenueForecastCents: number;
  revenueAccountingCents: number;
  marginForecastCents: number;
  marginAccountingCents: number;
  resultAccountingCents: number;
  resultEstimatedCents: number;
  resultGapCents: number;
}

/** Cumul de l'exercice sur les mois déjà calculés. */
export function computeTotals(
  months: FinancePnlMonthResponse[],
  expectedMonths: number,
): PnlTotals {
  const sum = (pick: (m: FinancePnlMonthResponse) => number) =>
    months.reduce((total, m) => total + pick(m), 0);
  return {
    loadedMonths: months.length,
    expectedMonths,
    revenueForecastCents: sum((m) => revenueLine(m)?.forecastCents ?? 0),
    revenueAccountingCents: sum((m) => revenueLine(m)?.accountingCents ?? 0),
    marginForecastCents: sum((m) => m.margin.forecastCents),
    marginAccountingCents: sum((m) => m.margin.accountingCents),
    resultAccountingCents: sum((m) => m.result.accountingCents),
    resultEstimatedCents: sum((m) => m.result.estimatedCents),
    resultGapCents: sum((m) => m.result.gapCents),
  };
}

/** Taux de marge en % (marge / CA), `null` sans CA. */
export function marginRatePct(marginCents: number, revenueCents: number): number | null {
  return revenueCents === 0 ? null : (marginCents / revenueCents) * 100;
}

/** Anomalies à traiter : celles d'un mois non calculé ne sont qu'un rappel, pas une charge manquante. */
export function openAnomalies(anomalies: FinanceAnomaly[]): FinanceAnomaly[] {
  return anomalies.filter((item) => item.type !== 'not_computed');
}

/** Montant en centimes, avec signe explicite (écarts) : « +1 234 € », « −56 € ». */
export function formatSignedEuros(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '—';
  const euros = Math.round(cents / 100);
  const text = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.abs(euros));
  if (euros === 0) return text;
  return `${euros > 0 ? '+' : '−'}${text}`;
}
