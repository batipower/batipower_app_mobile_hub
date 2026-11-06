import { useMemo } from 'react';
import { useIsFocused } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { preparationApi } from '@/api/preparation';
import type { PreparationOrder, StockFilter } from '@/types/preparation';

import { TO_PREPARE_REFRESH_MS } from '../constants';
import {
  isOrderAwaitingDriver,
  isOrderUnassigned,
  normalizeForSearch,
  orderSearchText,
} from '../orderHelpers';

export const PREPARATION_ORDERS_KEY = ['hub-preparation', 'orders', 'to-prepare'] as const;

/**
 * Requête des commandes à préparer, partagée par la liste et le détail (même clé de
 * cache : le détail se lit dans les données déjà chargées). L'actualisation
 * automatique ne tourne que tant que l'écran qui l'utilise est affiché.
 */
function usePreparationOrdersQuery() {
  const focused = useIsFocused();

  return useQuery({
    queryKey: PREPARATION_ORDERS_KEY,
    queryFn: () => preparationApi.getOrders('to-prepare'),
    placeholderData: keepPreviousData,
    refetchInterval: focused ? TO_PREPARE_REFRESH_MS : false,
    staleTime: 8_000,
  });
}

export type PreparationCounts = Record<StockFilter, number>;

/** Liste « à préparer » : filtres (stock QG, attente livreur, non affecté) et recherche locale. */
export function usePreparationOrders(stockFilter: StockFilter, search: string) {
  const query = usePreparationOrdersQuery();
  const orders = useMemo(() => query.data?.orders ?? [], [query.data]);

  const buckets = useMemo(() => {
    const awaiting: PreparationOrder[] = [];
    const inStock: PreparationOrder[] = [];
    const unassigned: PreparationOrder[] = [];
    for (const order of orders) {
      if (isOrderAwaitingDriver(order)) awaiting.push(order);
      else inStock.push(order);
      if (isOrderUnassigned(order)) unassigned.push(order);
    }
    return { all: orders, stock: inStock, attente: awaiting, nonaffecte: unassigned };
  }, [orders]);

  const counts: PreparationCounts = {
    all: buckets.all.length,
    stock: buckets.stock.length,
    attente: buckets.attente.length,
    nonaffecte: buckets.nonaffecte.length,
  };

  const filteredOrders = useMemo(() => {
    const base = buckets[stockFilter];
    const needle = normalizeForSearch(search);
    if (!needle) return base;
    return base.filter((order) => orderSearchText(order).includes(needle));
  }, [buckets, stockFilter, search]);

  return {
    orders,
    filteredOrders,
    counts,
    loading: query.isPending,
    error: query.error,
    lastRefresh: query.dataUpdatedAt || null,
    refetch: query.refetch,
  };
}

/** Détail d'une commande, lu dans la liste déjà chargée. */
export function usePreparationOrder(reference: string | undefined) {
  const query = usePreparationOrdersQuery();
  const order = useMemo(
    () => query.data?.orders.find((item) => item.reference === reference) ?? null,
    [query.data, reference],
  );

  return {
    order,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}
