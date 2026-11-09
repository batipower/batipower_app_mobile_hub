import { useQuery } from '@tanstack/react-query';

import { hubBrandMarginApi } from '@/api/hubBrandMargin';

import { BRAND_MARGIN_KEY } from '../queryKeys';

/** Stock QG Batipower d'une marque : instantané, indépendant de la période, du canal et de la vue SAV. */
export function useBrandStockQg(brand: string, enabled: boolean) {
  const query = useQuery({
    queryKey: [...BRAND_MARGIN_KEY, 'stock-qg', brand],
    queryFn: ({ signal }) => hubBrandMarginApi.stockQg(brand, { signal }),
    enabled: enabled && brand.length > 0,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isFetching && !query.isPending,
  };
}
