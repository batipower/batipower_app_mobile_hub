import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubBrandMarginApi } from '@/api/hubBrandMargin';

import { presetRange, type PeriodPresetId } from '../lib/model';
import { BRAND_MARGIN_KEY } from '../queryKeys';

/** Période (`YYYY-MM-DD`) d'un préset, recalculée seulement quand le préset change. */
export function usePeriodRange(preset: PeriodPresetId) {
  return useMemo(() => presetRange(preset), [preset]);
}

/**
 * Marge de toutes les marques sur la période (`GET hub-app/brand-margin`). Le calcul est lourd côté
 * back (cache de 60 s) : on garde les données précédentes à l'écran pendant un changement de période.
 */
export function useBrandMarginOverview(preset: PeriodPresetId, enabled: boolean) {
  const range = usePeriodRange(preset);
  const query = useQuery({
    queryKey: [...BRAND_MARGIN_KEY, 'overview', range.from, range.to],
    queryFn: ({ signal }) => hubBrandMarginApi.overview(range, { signal }),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    range,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    /** Rechargement d'une vue déjà affichée (changement de période) : pour un voile discret. */
    isRefetching: query.isFetching && !query.isPending,
    isPlaceholder: query.isPlaceholderData,
  };
}
