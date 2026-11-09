import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { hubDeploymentsApi } from '@/api/hubDeployments';

import { deploymentKey } from './queryKeys';

/** Déploiement d'un produit : ligne catalogue, dates par canal et négociations liées. */
export function useDeployment(reference: string | undefined) {
  const query = useQuery({
    queryKey: deploymentKey(reference ?? ''),
    queryFn: ({ signal }) => hubDeploymentsApi.get(reference as string, signal),
    enabled: !!reference,
    staleTime: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error,
    notFound: query.error instanceof ApiError && query.error.status === 404,
    refetch: query.refetch,
  };
}
