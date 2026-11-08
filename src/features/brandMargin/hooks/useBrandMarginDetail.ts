import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubBrandMarginApi } from '@/api/hubBrandMargin';

import type { PeriodPresetId } from '../lib/model';
import { BRAND_MARGIN_KEY } from '../queryKeys';
import { usePeriodRange } from './useBrandMarginOverview';

/** Détail d'une marque (`GET hub-app/brand-margin/brand`) sur la période et la marketplace filtrées. */
export function useBrandMarginDetail(
  brand: string,
  preset: PeriodPresetId,
  origin: string | null,
  enabled: boolean,
) {
  const range = usePeriodRange(preset);
  const query = useQuery({
    queryKey: [...BRAND_MARGIN_KEY, 'brand', brand, range.from, range.to, origin],
    queryFn: ({ signal }) => hubBrandMarginApi.brand(brand, range, origin, { signal }),
    placeholderData: keepPreviousData,
    enabled: enabled && brand.length > 0,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    range,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isFetching && !query.isPending,
  };
}
