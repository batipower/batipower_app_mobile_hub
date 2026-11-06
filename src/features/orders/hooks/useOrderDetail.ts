import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { hubOrdersApi } from '@/api/hubOrders';

export const orderDetailKey = (reference: string | undefined) =>
  ['hub-order-detail', reference] as const;

/** Fiche complète d'une commande (`logistics-detail`) : commande, retours, litiges, commandes liées. */
export function useOrderDetail(reference: string | undefined) {
  const query = useQuery({
    queryKey: orderDetailKey(reference),
    queryFn: ({ signal }) => hubOrdersApi.getLogisticsDetail(reference ?? '', signal),
    enabled: !!reference,
    staleTime: 30_000,
    // Une commande inconnue ne se « répare » pas en réessayant.
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });

  const detail = query.data?.data ?? null;
  const notFound =
    (query.error instanceof ApiError && query.error.status === 404) ||
    (query.isSuccess && detail === null);

  return {
    detail,
    notFound,
    loading: query.isPending && query.fetchStatus !== 'idle',
    /** Erreur à afficher : jamais pour une commande introuvable (état dédié). */
    error: notFound ? null : query.error,
    refetch: query.refetch,
  };
}
