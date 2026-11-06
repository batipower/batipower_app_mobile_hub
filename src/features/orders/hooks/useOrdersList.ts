import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { hubOrdersApi } from '@/api/hubOrders';
import { MIN_SEARCH_LENGTH, PAGE_SIZE, toOrderHit } from '@/features/search/searchHelpers';
import type {
  HubOrdersByProductResult,
  HubProductOrder,
  HubSavOrder,
  HubSavSearchResult,
  OrderSearchHit,
} from '@/types/order';

/** `search` = recherche libre ; `product` = commandes qui contiennent une référence produit. */
export type OrdersListMode = 'search' | 'product';

type Page = HubSavSearchResult | HubOrdersByProductResult;

/**
 * Liste complète et paginée (défilement infini, 20 par page) des commandes d'une
 * recherche. Les pages sont dédoublonnées par `uuid` : une commande qui change de page
 * entre deux appels (nouvelle commande en tête) ne s'affiche pas deux fois.
 */
export function useOrdersList(mode: OrdersListMode, term: string) {
  const query = useInfiniteQuery<Page>({
    queryKey: ['hub-orders-list', mode, term],
    queryFn: ({ pageParam, signal }) => {
      const page = pageParam as number;
      return mode === 'product'
        ? hubOrdersApi.searchByProductReference(term, { page, limit: PAGE_SIZE, signal })
        : hubOrdersApi.searchSav(term, { page, limit: PAGE_SIZE, signal });
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: term.length >= MIN_SEARCH_LENGTH,
    staleTime: 60_000,
  });

  const orders = useMemo<OrderSearchHit[]>(() => {
    const seen = new Set<string>();
    const hits: OrderSearchHit[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const order of page.orders as readonly (HubSavOrder | HubProductOrder)[]) {
        if (seen.has(order.uuid)) continue;
        seen.add(order.uuid);
        hits.push(toOrderHit(order, mode === 'product'));
      }
    }
    return hits;
  }, [query.data, mode]);

  const first = query.data?.pages[0];

  return {
    orders,
    /** Nombre total de commandes (toutes pages confondues). */
    total: first?.count ?? null,
    /** Quantité totale du produit sur ces commandes (mode `product`, première page). */
    totalQuantity: first && 'summary' in first ? (first.summary?.totalQuantity ?? null) : null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.error,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
