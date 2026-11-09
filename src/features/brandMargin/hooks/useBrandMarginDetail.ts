import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubBrandMarginApi } from '@/api/hubBrandMargin';

import type { PeriodRange } from '../lib/model';
import { BRAND_MARGIN_KEY } from '../queryKeys';

/** Détail d'une marque (`GET hub-app/brand-margin/brand`) sur la période, la marketplace et les filiales filtrées. */
export function useBrandMarginDetail(
  brand: string,
  range: PeriodRange,
  origin: string | null,
  warehouses: readonly string[],
  enabled: boolean,
) {
  const query = useQuery({
    queryKey: [
      ...BRAND_MARGIN_KEY,
      'brand',
      brand,
      range.from,
      range.to,
      origin,
      [...warehouses].sort(),
    ],
    queryFn: ({ signal }) => hubBrandMarginApi.brand(brand, range, origin, warehouses, { signal }),
    placeholderData: keepPreviousData,
    enabled: enabled && brand.length > 0,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isFetching && !query.isPending,
    isPlaceholder: query.isPlaceholderData,
    isError: query.isError,
  };
}
