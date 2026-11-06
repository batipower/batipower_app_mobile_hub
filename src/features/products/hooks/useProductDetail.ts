import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { hubProductsApi } from '@/api/hubProducts';

const retryUnlessNotFound = (count: number, error: unknown) =>
  !(error instanceof ApiError && error.status === 404) && count < 2;

/**
 * Fiche produit : en-tête et stock sont deux appels indépendants, lancés en parallèle.
 * L'en-tête s'affiche dès qu'il arrive (avec le stock résumé qu'il porte) ; une erreur
 * sur le stock détaillé n'empêche donc pas de consulter la fiche.
 *
 * `enabled` est faux pour les rôles sans accès : aucun appel n'est envoyé (le back répond 403).
 */
export function useProductDetail(reference: string | undefined, enabled: boolean) {
  const active = enabled && !!reference;

  const header = useQuery({
    queryKey: ['hub-product-header', reference],
    queryFn: ({ signal }) => hubProductsApi.getHeader(reference ?? '', signal),
    enabled: active,
    staleTime: 60_000,
    retry: retryUnlessNotFound,
  });

  const stock = useQuery({
    queryKey: ['hub-product-stock', reference],
    queryFn: ({ signal }) => hubProductsApi.getStock(reference ?? '', signal),
    enabled: active,
    staleTime: 30_000,
    retry: retryUnlessNotFound,
  });

  const notFound = header.error instanceof ApiError && header.error.status === 404;

  const refetchStock = stock.refetch;
  const refetchHeader = header.refetch;
  const refetch = useCallback(
    () => Promise.all([refetchHeader(), refetchStock()]),
    [refetchHeader, refetchStock],
  );

  return {
    header: header.data ?? null,
    stock: stock.data ?? null,
    notFound,
    headerLoading: header.isPending && header.fetchStatus !== 'idle',
    headerError: notFound ? null : header.error,
    stockLoading: stock.isPending && stock.fetchStatus !== 'idle',
    stockError: stock.error,
    refetch,
    refetchStock,
  };
}
