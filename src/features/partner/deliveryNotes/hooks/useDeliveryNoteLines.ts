import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { partnerDeliveryNotesApi } from '@/api/partnerDeliveryNotes';
import type { PartnerDeliveryNoteLinesResponse } from '@/types/partnerDeliveryNotes';

import { PARTNER_DELIVERY_NOTES_KEY } from '../../queryKeys';
import { PARTNER_PAGE_SIZE, flattenPages } from '../../shared/pages';
import type { DeliveryNotesFilters } from '../filtersStore';

/** Lignes en écart de prix des BL (une ligne = un article d'un BL), en défilement infini par `offset`. */
export function useDeliveryNoteLines(filters: DeliveryNotesFilters) {
  const treated = filters.view === 'treated';
  const brands = filters.brand ? [filters.brand] : undefined;

  const query = useInfiniteQuery<PartnerDeliveryNoteLinesResponse>({
    queryKey: [...PARTNER_DELIVERY_NOTES_KEY, 'lines', { treated, brand: filters.brand }],
    queryFn: ({ pageParam, signal }) =>
      partnerDeliveryNotesApi.listLines(
        { treated, brands, limit: PARTNER_PAGE_SIZE, offset: pageParam as number },
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
        (line) => `${line.deliveryNoteUuid}:${line.ebatRef}`,
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

/** Avancement du traitement : lignes traitées et à traiter pour la marque choisie. */
export function useDeliveryNoteProgress(brand: string | null) {
  const brands = brand ? [brand] : undefined;
  const pending = useQuery({
    queryKey: [...PARTNER_DELIVERY_NOTES_KEY, 'progress', 'pending', brand],
    queryFn: ({ signal }) => partnerDeliveryNotesApi.linesCount(false, brands, { signal }),
    staleTime: 30_000,
  });
  const treated = useQuery({
    queryKey: [...PARTNER_DELIVERY_NOTES_KEY, 'progress', 'treated', brand],
    queryFn: ({ signal }) => partnerDeliveryNotesApi.linesCount(true, brands, { signal }),
    staleTime: 30_000,
  });

  const loaded = pending.data !== undefined && treated.data !== undefined;
  const pendingCount = pending.data ?? 0;
  const treatedCount = treated.data ?? 0;
  const total = pendingCount + treatedCount;
  return {
    loaded,
    pending: pendingCount,
    treated: treatedCount,
    total,
    percent: total > 0 ? Math.round((treatedCount / total) * 100) : 0,
  };
}
