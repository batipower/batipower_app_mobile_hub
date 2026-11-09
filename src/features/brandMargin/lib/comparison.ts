import type { HubBrandMarginFigures } from '@/types/hubBrandMargin';

import { parseYmd, ymd, type PeriodRange } from './model';

/**
 * Comparaison de l'en-tête avec le mois calendaire complet qui précède la période affichée
 * (reprise de `lib/hub/brand-margin/comparison.ts` du web). Fonctions pures.
 */

/** Mois calendaire complet qui précède le mois de fin de la période (mois en cours -> mois dernier). */
export function referenceMonthRange(period: PeriodRange): PeriodRange {
  const end = parseYmd(period.to);
  return {
    from: ymd(new Date(end.getFullYear(), end.getMonth() - 1, 1)),
    // Jour 0 du mois de fin = dernier jour du mois précédent.
    to: ymd(new Date(end.getFullYear(), end.getMonth(), 0)),
  };
}

/** Vrai si la période est exactement un mois calendaire entier (1er au dernier jour). */
export function isFullCalendarMonth(period: PeriodRange): boolean {
  const start = parseYmd(period.from);
  const end = parseYmd(period.to);
  return (
    start.getDate() === 1 &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  );
}

/** « Mois dernier » quand la référence est bien le mois précédant `now`, sinon « octobre 2026 ». */
export function referenceLabel(reference: PeriodRange, now: Date = new Date()): string {
  const lastMonthStart = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  if (reference.from === lastMonthStart) return 'Mois dernier';
  return parseYmd(reference.from).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/** Écart en % de `current` par rapport à `reference` ; `null` quand la référence est nulle. */
export function amountDeltaPct(current: number, reference: number): number | null {
  if (reference === 0) return null;
  return ((current - reference) / Math.abs(reference)) * 100;
}

/** Écart en points entre deux taux ; `null` si l'un des deux manque. */
export function rateDeltaPoints(current: number | null, reference: number | null): number | null {
  return current != null && reference != null ? current - reference : null;
}

export interface MarginComparison {
  /** Montant du mois de référence. */
  amount: number;
  rate: number | null;
  /** Écart de taux en points : comparable quelle que soit la durée de la période. */
  ratePoints: number | null;
  /** Écart de montant en %, seulement si la période affichée est un mois entier. */
  amountPct: number | null;
}

export interface FiguresComparison {
  referenceRange: PeriodRange;
  label: string;
  /** Le mois de référence n'a aucune vente : on n'affiche que « n/a ». */
  empty: boolean;
  /** Les montants sont comparables en % (période affichée = mois entier). */
  amountsComparable: boolean;
  ca: { amount: number; amountPct: number | null };
  gross: MarginComparison;
  net: MarginComparison;
  /** Impact SAV : un écart positif est une dégradation. */
  sav: { amount: number; amountPct: number | null };
}

export function compareFigures(
  current: HubBrandMarginFigures,
  reference: HubBrandMarginFigures,
  period: PeriodRange,
  now: Date = new Date(),
): FiguresComparison {
  const referenceRange = referenceMonthRange(period);
  const amountsComparable = isFullCalendarMonth(period);
  const pct = (cur: number, ref: number) => (amountsComparable ? amountDeltaPct(cur, ref) : null);
  return {
    referenceRange,
    label: referenceLabel(referenceRange, now),
    empty: reference.orders === 0,
    amountsComparable,
    ca: { amount: reference.caHT, amountPct: pct(current.caHT, reference.caHT) },
    gross: {
      amount: reference.grossMarginHT,
      rate: reference.grossMarginRate,
      ratePoints: rateDeltaPoints(current.grossMarginRate, reference.grossMarginRate),
      amountPct: pct(current.grossMarginHT, reference.grossMarginHT),
    },
    net: {
      amount: reference.netMarginHT,
      rate: reference.netMarginRate,
      ratePoints: rateDeltaPoints(current.netMarginRate, reference.netMarginRate),
      amountPct: pct(current.netMarginHT, reference.netMarginHT),
    },
    sav: { amount: reference.sav.totalHT, amountPct: pct(current.sav.totalHT, reference.sav.totalHT) },
  };
}
