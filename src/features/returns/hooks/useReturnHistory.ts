import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { hubReturnsApi, type HubReturnHistoryItem, type ReturnHistoryResponse } from '@/api/hubReturns';

import { RETURN_HISTORY_PAGE_SIZE } from '../constants';
import type { ReturnsFilters } from '../filtersStore';
import { RETURNS_HISTORY_KEY } from '../queryKeys';

/**
 * Historique des retours paginé (défilement infini). La page est portée par la requête : elle est
 * donc absente de la clé de cache.
 */
export function useReturnHistory(filters: ReturnsFilters, search: string, enabled: boolean) {
  const base = useMemo(
    () => ({
      source: filters.source === 'ALL' ? undefined : filters.source,
      type: filters.type,
      search: search || undefined,
      limit: RETURN_HISTORY_PAGE_SIZE,
    }),
    [filters.source, filters.type, search],
  );

  const query = useInfiniteQuery<ReturnHistoryResponse>({
    queryKey: [...RETURNS_HISTORY_KEY, base],
    queryFn: ({ pageParam, signal }) =>
      hubReturnsApi.history({ ...base, page: pageParam as number }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasNext ? last.pagination.page + 1 : undefined),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 30_000,
  });

  const items = useMemo<HubReturnHistoryItem[]>(() => {
    const seen = new Set<string>();
    const out: HubReturnHistoryItem[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        const key = `${item.source}-${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  }, [query.data]);

  return {
    items,
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
