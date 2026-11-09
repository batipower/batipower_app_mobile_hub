import { useMemo } from 'react';

import type { HubBrandMarginFigures } from '@/types/hubBrandMargin';

import { compareFigures, referenceMonthRange, type FiguresComparison } from '../lib/comparison';
import { filterByOrigin, type PeriodRange } from '../lib/model';
import { useBrandMarginDetail } from './useBrandMarginDetail';
import { useBrandMarginOverview } from './useBrandMarginOverview';

export type BrandMarginComparisonState = {
  /** `null` tant que la référence n'est pas chargée, ou si son chargement a échoué. */
  comparison: FiguresComparison | null;
  loading: boolean;
};

/**
 * Comparaison de l'en-tête de la liste avec le mois dernier complet : second appel de la même API,
 * non bloquant, avec les mêmes filtres marketplace et filiales.
 */
export function useOverviewComparison(
  range: PeriodRange,
  current: HubBrandMarginFigures | null,
  origin: string | null,
  warehouses: readonly string[],
  enabled: boolean,
): BrandMarginComparisonState {
  const reference = useMemo(() => referenceMonthRange(range), [range]);
  const query = useBrandMarginOverview(reference, warehouses, enabled && current != null);
  // Pendant un changement de période, les données de la référence précédente sont conservées : on les ignore.
  const data = query.isPlaceholder ? null : query.data;

  const comparison = useMemo(() => {
    if (!current || !data) return null;
    return compareFigures(current, filterByOrigin(data, origin).totals, range);
  }, [current, data, origin, range]);

  return { comparison, loading: enabled && current != null && comparison == null && !query.isError };
}

/** Même comparaison pour la fiche d'une marque (détail de la marque sur le mois de référence). */
export function useBrandComparison(
  brand: string,
  range: PeriodRange,
  current: HubBrandMarginFigures | null,
  origin: string | null,
  warehouses: readonly string[],
  enabled: boolean,
): BrandMarginComparisonState {
  const reference = useMemo(() => referenceMonthRange(range), [range]);
  const query = useBrandMarginDetail(brand, reference, origin, warehouses, enabled && current != null);
  const data = query.isPlaceholder ? null : query.data;

  const comparison = useMemo(() => {
    if (!current || !data) return null;
    return compareFigures(current, data.totals, range);
  }, [current, data, range]);

  return { comparison, loading: enabled && current != null && comparison == null && !query.isError };
}
