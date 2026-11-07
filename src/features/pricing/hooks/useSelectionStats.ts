import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubPricingApi } from '@/api/hubPricing';
import type { HubPricingFilters, HubPricingSelectionStatsMonths } from '@/types/hubPricing';

/** Statistiques et analyses (pays, canaux, tops, site) de la sélection filtrée sur 3/6/12 mois. */
export function useSelectionStats(
  filters: HubPricingFilters,
  months: HubPricingSelectionStatsMonths,
  enabled: boolean,
) {
  const selection = useMemo(
    () => ({ ...filters, page: 1, sortBy: '' as const, sortOrder: 'desc' as const }),
    [filters],
  );

  const stats = useQuery({
    queryKey: ['hub-pricing', 'selection-stats', selection, months],
    queryFn: ({ signal }) => hubPricingApi.selectionStats(selection, months, { signal }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const insights = useQuery({
    queryKey: ['hub-pricing', 'selection-insights', selection, months],
    queryFn: ({ signal }) => hubPricingApi.selectionInsights(selection, months, { signal }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return {
    stats: stats.data,
    insights: insights.data,
    statsLoading: stats.isPending,
    insightsLoading: insights.isPending,
    statsError: stats.error,
    insightsError: insights.error,
    refetch: () => Promise.all([stats.refetch(), insights.refetch()]),
  };
}
