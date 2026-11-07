import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { hubPricingApi } from '@/api/hubPricing';
import type { HubPricingFilters, HubPricingPage, HubPricingRow } from '@/types/hubPricing';

import { PRICING_LIST_KEY } from '../queryKeys';

const PAGE_SIZE = 50;

/**
 * Pays envoyé à l'API pour le tri `salesHistory*` : hors France, le tri suit le pays affiché
 * (comme `PricingPageContent` côté web).
 */
export function salesCountryFor(filters: HubPricingFilters, country: string): string | null {
  return filters.sortBy.startsWith('salesHistory') && country !== 'FR' ? country : null;
}

/**
 * Liste Pricing paginée (défilement infini). La page est portée par la requête : elle est
 * donc retirée des filtres de la clé de cache.
 */
export function usePricingList(filters: HubPricingFilters, country: string, enabled: boolean) {
  const base = useMemo(() => ({ ...filters, page: 1, limit: PAGE_SIZE }), [filters]);
  const salesCountry = salesCountryFor(filters, country);

  const query = useInfiniteQuery<HubPricingPage>({
    queryKey: [...PRICING_LIST_KEY, base, salesCountry],
    queryFn: ({ pageParam, signal }) =>
      hubPricingApi.list({ ...base, page: pageParam as number }, { signal, salesCountry }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 60_000,
  });

  const rows = useMemo<HubPricingRow[]>(() => {
    const seen = new Set<string>();
    const out: HubPricingRow[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const row of page.data) {
        if (seen.has(row.uuid)) continue;
        seen.add(row.uuid);
        out.push(row);
      }
    }
    return out;
  }, [query.data]);

  return {
    rows,
    total: query.data?.pages[0]?.pagination.total ?? null,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    /** Rechargement d'une liste déjà affichée (changement de filtre) : pour un voile discret. */
    isRefetching: query.isFetching && !query.isFetchingNextPage && !query.isPending,
  };
}
