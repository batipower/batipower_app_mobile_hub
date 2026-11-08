import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { partnerInterAgencyApi } from '@/api/partnerInterAgency';
import { useAuth } from '@/auth/AuthProvider';

import { PARTNER_INTER_AGENCY_ORDERS_KEY } from '../../queryKeys';
import { INTER_AGENCY_STATUS_TABS } from '../constants';
import type { InterAgencyFilters } from '../filtersStore';
import { countByStatus, interAgencyStatus, scopeOrders } from '../lib';

/** Commandes inter-agences en cours (le back les cloisonne au distributeur du compte), relancées chaque minute. */
export function useInterAgencyOrdersQuery() {
  return useQuery({
    queryKey: PARTNER_INTER_AGENCY_ORDERS_KEY,
    queryFn: ({ signal }) => partnerInterAgencyApi.listOrders({ signal }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** Liste filtrée (entrepôt, mes commandes, recherche, statut) et compteurs des puces. */
export function useInterAgencyList(filters: InterAgencyFilters, term: string) {
  const { user } = useAuth();
  const query = useInterAgencyOrdersQuery();

  return useMemo(() => {
    const scoped = scopeOrders(query.data ?? [], filters, user, term);
    const items =
      filters.status === 'ALL'
        ? scoped
        : scoped.filter((order) => interAgencyStatus(order) === filters.status);
    const counts = countByStatus(scoped);
    return {
      items,
      counts,
      tabs: INTER_AGENCY_STATUS_TABS.map((tab) => ({ ...tab, count: counts[tab.key] })),
      total: query.data ? items.length : null,
      loading: query.isPending,
      error: query.error,
      refetch: query.refetch,
      fetchNextPage: () => Promise.resolve(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isRefetching: query.isFetching && !query.isPending,
    };
  }, [query, filters, user, term]);
}
