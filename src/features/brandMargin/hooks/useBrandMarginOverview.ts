import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubBrandMarginApi } from '@/api/hubBrandMargin';

import type { PeriodRange } from '../lib/model';
import { BRAND_MARGIN_KEY } from '../queryKeys';

/**
 * Marge de toutes les marques sur la période (`GET hub-app/brand-margin`). Le calcul est lourd côté
 * back (cache de 60 s) : on garde les données précédentes à l'écran pendant un changement de période.
 */
export function useBrandMarginOverview(
  range: PeriodRange,
  warehouses: readonly string[],
  enabled: boolean,
) {
  const query = useQuery({
    queryKey: [...BRAND_MARGIN_KEY, 'overview', range.from, range.to, [...warehouses].sort()],
    queryFn: ({ signal }) => hubBrandMarginApi.overview(range, warehouses, { signal }),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.error,
    refetch: query.refetch,
    /** Rechargement d'une vue déjà affichée (changement de période) : pour un voile discret. */
    isRefetching: query.isFetching && !query.isPending,
    isPlaceholder: query.isPlaceholderData,
    isError: query.isError,
  };
}
