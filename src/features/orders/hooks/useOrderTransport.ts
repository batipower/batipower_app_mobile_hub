import { useQuery } from '@tanstack/react-query';

import { hubOrdersApi } from '@/api/hubOrders';

/** Coûts transport estimés d'une commande, colis par colis (`transport-comparison`, SUPERADMIN). */
export function useOrderTransport(reference: string | undefined, enabled: boolean) {
  const query = useQuery({
    queryKey: ['hub-order-transport', reference] as const,
    queryFn: ({ signal }) => hubOrdersApi.getTransportComparison(reference ?? '', signal),
    enabled: enabled && !!reference,
    staleTime: 60_000,
  });

  return {
    data: query.data?.data ?? null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.error,
    refetch: query.refetch,
  };
}
