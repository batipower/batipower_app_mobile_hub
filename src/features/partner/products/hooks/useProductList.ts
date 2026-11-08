import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { partnerProductsApi } from '@/api/partnerProducts';
import type { PartnerPaginated, PartnerProduct } from '@/types/partnerProducts';

import { PARTNER_PRODUCTS_KEY } from '../../queryKeys';
import { PARTNER_PAGE_SIZE, flattenPages } from '../../shared/pages';
import type { ProductSegment, ProductsFilters } from '../filtersStore';

/**
 * Liste des produits paginée (défilement infini), standard ou DEP. La page est portée par la
 * requête : elle est absente de la clé de cache.
 */
export function useProductList(segment: ProductSegment, filters: ProductsFilters, search: string) {
  const base = useMemo(
    () => ({
      search: search || undefined,
      brand: filters.brand ?? undefined,
      limit: PARTNER_PAGE_SIZE,
    }),
    [search, filters.brand],
  );
  const criticite = filters.criticite ?? undefined;
  const awaitingMyReply = filters.awaitingMyReply;
  const depWarehouse = filters.depWarehouse ?? undefined;

  const query = useInfiniteQuery<PartnerPaginated<PartnerProduct>>({
    queryKey: [
      ...PARTNER_PRODUCTS_KEY,
      'list',
      segment,
      base,
      segment === 'dep' ? { depWarehouse } : { criticite, awaitingMyReply },
    ],
    queryFn: ({ pageParam, signal }) => {
      const page = pageParam as number;
      return segment === 'dep'
        ? partnerProductsApi.listDep({ ...base, page, depWarehouse }, { signal })
        : partnerProductsApi.list(
            { ...base, page, niveauCriticite: criticite, awaitingMyReply },
            { signal },
          );
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
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
    /** Rechargement d'une liste déjà affichée (changement de filtre) : pour un voile discret. */
    isRefetching: query.isFetching && !query.isFetchingNextPage && !query.isPending,
  };
}
