import { useMemo } from 'react';

import type { BrandMarginFilters } from '../filtersStore';
import { periodError, presetRange, type PeriodRange } from '../lib/model';

/**
 * Période (`YYYY-MM-DD`) des filtres, recalculée seulement quand le préréglage ou les dates changent,
 * avec son erreur de validation (dates personnalisées incomplètes ou au-delà de 366 jours).
 */
export function useBrandMarginRange(
  filters: Pick<BrandMarginFilters, 'period' | 'from' | 'to'>,
): { range: PeriodRange; error: string | null } {
  const { period, from, to } = filters;
  return useMemo(() => {
    const range = presetRange(period, new Date(), { from, to });
    const error =
      period === 'custom' && (!from || !to) ? 'Renseignez une date de début et de fin.' : periodError(range);
    return { range, error };
  }, [period, from, to]);
}
