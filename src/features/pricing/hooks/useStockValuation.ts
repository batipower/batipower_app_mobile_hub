import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { hubPricingApi } from '@/api/hubPricing';
import type { HubPricingFilters } from '@/types/hubPricing';

import { isQgStockFilter } from '../filters';

/** Filtres sans pagination ni tri : ils ne changent pas la sélection. */
function selectionFilters(filters: HubPricingFilters): HubPricingFilters {
  return { ...filters, page: 1, sortBy: '', sortOrder: 'desc' };
}

/** Valorisation du stock QG de la sélection : appelée seulement quand le filtre stock QG est actif. */
export function useStockValuation(filters: HubPricingFilters) {
  const active = isQgStockFilter(filters);
  const selection = useMemo(() => selectionFilters(filters), [filters]);
  const query = useQuery({
    queryKey: ['hub-pricing', 'stock-valuation', { ...selection, limit: 0 }],
    queryFn: ({ signal }) => hubPricingApi.stockValuation(selection, { signal }),
    enabled: active,
    staleTime: 60_000,
  });
  return {
    active,
    data: query.data,
    loading: query.isPending && active,
    refreshing: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
