import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { partnerOpportunitiesApi } from '@/api/partnerOpportunities';
import type { PartnerOpportunitiesResponse } from '@/types/partnerOpportunities';

import { PARTNER_OPPORTUNITIES_KEY } from '../../queryKeys';
import { PARTNER_PAGE_SIZE, flattenPages } from '../../shared/pages';
import type { OpportunitiesFilters } from '../filtersStore';

/**
 * Liste des opportunités en défilement infini. Le back pagine par `offset` ; le statut « Toutes »
 * n'envoie pas de statut, et le filtre « non lues » n'est transmis que sur les ouvertes (il
 * écraserait sinon le statut côté back, comme sur le web).
 */
export function useOpportunityList(filters: OpportunitiesFilters, reference: string) {
  const { scope, brand } = filters;
  const status = filters.status === 'ALL' ? undefined : filters.status;
  const unread = filters.status === 'OPEN' && filters.unreadOnly;

  const query = useInfiniteQuery<PartnerOpportunitiesResponse>({
    queryKey: [
      ...PARTNER_OPPORTUNITIES_KEY,
      'list',
      scope,
      { status, brand, unread, reference },
    ],
    queryFn: ({ pageParam, signal }) =>
      partnerOpportunitiesApi.list(
        {
          scope,
          status,
          brands: brand ? [brand] : undefined,
          reference: reference || undefined,
          unread,
          limit: PARTNER_PAGE_SIZE,
          offset: pageParam as number,
        },
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return last.items.length > 0 && loaded < last.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const items = useMemo(
    () =>
      flattenPages(
        query.data?.pages,
        (page) => page.items,
        (item) => item.uuid,
      ),
    [query.data],
  );

  return {
    items,
    total: query.data?.pages[0]?.total ?? null,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isFetching && !query.isFetchingNextPage && !query.isPending,
  };
}
