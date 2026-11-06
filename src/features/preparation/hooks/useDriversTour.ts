import { useIsFocused } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { preparationApi } from '@/api/preparation';

import { DRIVERS_TOUR_REFRESH_MS } from '../constants';

/** « À chercher en agence » : articles en attente livreur, regroupés par agence proche. */
export function useDriversTour() {
  const focused = useIsFocused();

  const query = useQuery({
    queryKey: ['hub-preparation', 'drivers-tour'],
    queryFn: () => preparationApi.getDriversTour(),
    placeholderData: keepPreviousData,
    refetchInterval: focused ? DRIVERS_TOUR_REFRESH_MS : false,
    staleTime: 10_000,
  });

  return {
    agencies: query.data?.agencies ?? [],
    totalOrders: query.data?.totalOrders ?? 0,
    totalReferences: query.data?.totalReferences ?? 0,
    totalPieces: query.data?.totalPieces ?? 0,
    loaded: query.data !== undefined,
    loading: query.isPending,
    error: query.error,
    lastRefresh: query.dataUpdatedAt || null,
    refetch: query.refetch,
  };
}
