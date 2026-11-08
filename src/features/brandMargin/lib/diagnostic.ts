import type { HubBrandMarginFigures } from '@/types/hubBrandMargin';
import { marginOf, type MarginView } from './model';

/** CA minimal (HT) en dessous duquel les comparaisons à la moyenne sont trop bruitées pour alerter. */
export const MIN_CA_FOR_RELATIVE_ALERTS = 200;

/** Écarts (points de % du CA) au-delà desquels un poste de coût est signalé. */
export const ALERT_GAP_POINTS = {
  rate: 5,
  sav: 2,
  transport: 3,
  purchases: 5,
} as const;

export type CostLineId = 'purchases' | 'transport' | 'commissions' | 'sav';

export const COST_LINE_LABELS: Record<CostLineId, string> = {
  purchases: 'Achats',
  transport: 'Transport',
  commissions: 'Commissions',
  sav: 'Impact SAV',
};

export const COST_LINE_IDS: readonly CostLineId[] = [
  'purchases',
  'transport',
  'commissions',
  'sav',
];

export type CostRatios = Record<CostLineId, number | null>;

function ratio(amount: number, caHT: number): number | null {
  return caHT > 0 ? (amount / caHT) * 100 : null;
}

/** Montant de chaque poste de coût (euros HT). */
export function costAmounts(figures: HubBrandMarginFigures): Record<CostLineId, number> {
  return {
    purchases: figures.purchasesHT,
    transport: figures.transportHT,
    commissions: figures.commissionsHT,
    sav: figures.sav.totalHT,
  };
}

/** Postes de coût en % du CA HT (`null` quand le CA est nul). */
export function costRatios(figures: HubBrandMarginFigures): CostRatios {
  const amounts = costAmounts(figures);
  return {
    purchases: ratio(amounts.purchases, figures.caHT),
    transport: ratio(amounts.transport, figures.caHT),
    commissions: ratio(amounts.commissions, figures.caHT),
    sav: ratio(amounts.sav, figures.caHT),
  };
}

/** Écart de taux de marge (en points) avec la moyenne ; `null` si l'un des deux taux est inconnu. */
export function rateGap(
  figures: HubBrandMarginFigures,
  average: HubBrandMarginFigures,
  view: MarginView,
): number | null {
  const own = marginOf(figures, view).rate;
  const reference = marginOf(average, view).rate;
  return own != null && reference != null ? own - reference : null;
}

export type BrandAlertId = 'negative' | 'lowRate' | 'sav' | 'transport' | 'purchases';

export interface BrandAlert {
  id: BrandAlertId;
  label: string;
  severity: 'bad' | 'warn';
  detail: string;
}

function points(value: number): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} pt`;
}

/** Signaux de diagnostic d'une marque par rapport à la moyenne de toutes les marques. */
export function brandAlerts(
  figures: HubBrandMarginFigures,
  average: HubBrandMarginFigures,
  view: MarginView,
): BrandAlert[] {
  const alerts: BrandAlert[] = [];
  const margin = marginOf(figures, view);
  if (margin.value < 0) {
    alerts.push({
      id: 'negative',
      label: 'Marge négative',
      severity: 'bad',
      detail: "La marque perd de l'argent sur la période.",
    });
  }
  if (figures.caHT < MIN_CA_FOR_RELATIVE_ALERTS) return alerts;

  const gap = rateGap(figures, average, view);
  if (margin.value >= 0 && gap != null && gap <= -ALERT_GAP_POINTS.rate) {
    alerts.push({
      id: 'lowRate',
      label: 'Taux sous la moyenne',
      severity: 'warn',
      detail: `${points(Math.abs(gap))} sous le taux moyen.`,
    });
  }
  const own = costRatios(figures);
  const reference = costRatios(average);
  const diff = (line: CostLineId) =>
    own[line] != null && reference[line] != null ? own[line] - reference[line] : null;
  const savGap = diff('sav');
  if (savGap != null && savGap >= ALERT_GAP_POINTS.sav) {
    alerts.push({
      id: 'sav',
      label: 'SAV élevé',
      severity: 'bad',
      detail: `${points(savGap)} de CA de plus que la moyenne.`,
    });
  }
  const transportGap = diff('transport');
  if (transportGap != null && transportGap >= ALERT_GAP_POINTS.transport) {
    alerts.push({
      id: 'transport',
      label: 'Transport élevé',
      severity: 'warn',
      detail: `${points(transportGap)} de CA de plus que la moyenne.`,
    });
  }
  const purchasesGap = diff('purchases');
  if (purchasesGap != null && purchasesGap >= ALERT_GAP_POINTS.purchases) {
    alerts.push({
      id: 'purchases',
      label: 'Achats élevés',
      severity: 'warn',
      detail: `${points(purchasesGap)} de CA de plus que la moyenne.`,
    });
  }
  return alerts;
}

export interface MarginStep {
  id: string;
  label: string;
  /** Montant signé : positif ajoute à la marge, négatif la réduit. */
  amount: number;
  kind: 'revenue' | 'cost' | 'result';
}

/** De « CA HT » à la marge de la vue : chaque étape explique l'écart avec la précédente. */
export function marginSteps(figures: HubBrandMarginFigures, view: MarginView): MarginStep[] {
  const steps: MarginStep[] = [
    { id: 'ca', label: 'CA HT', amount: figures.caHT, kind: 'revenue' },
    { id: 'purchases', label: 'Achats', amount: -figures.purchasesHT, kind: 'cost' },
    { id: 'transport', label: 'Transport', amount: -figures.transportHT, kind: 'cost' },
    {
      id: 'commissions',
      label: 'Commissions marketplace',
      amount: -figures.commissionsHT,
      kind: 'cost',
    },
  ];
  if (figures.quoteAdjustmentHT !== 0) {
    steps.push({
      id: 'quote',
      label: 'Ajustement devis',
      amount: figures.quoteAdjustmentHT,
      kind: 'cost',
    });
  }
  if (figures.cancellationsHT !== 0) {
    steps.push({
      id: 'cancellations',
      label: 'Annulations',
      amount: -figures.cancellationsHT,
      kind: 'cost',
    });
  }
  if (view === 'net') {
    steps.push({ id: 'sav', label: 'Impact SAV', amount: -figures.sav.totalHT, kind: 'cost' });
  }
  steps.push({
    id: 'margin',
    label: view === 'net' ? 'Marge avec SAV' : 'Marge sans SAV',
    amount: marginOf(figures, view).value,
    kind: 'result',
  });
  return steps;
}
