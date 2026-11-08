import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { partnerOpportunitiesApi } from '@/api/partnerOpportunities';

import { partnerOpportunityDetailKey } from '../../queryKeys';

/** Fiche d'une opportunité (avec ses propositions de prix). */
export function useOpportunityDetail(uuid: string | undefined) {
  const query = useQuery({
    queryKey: partnerOpportunityDetailKey(uuid ?? ''),
    queryFn: ({ signal }) => partnerOpportunitiesApi.detail(uuid as string, { signal }),
    enabled: !!uuid,
    staleTime: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  return {
    opportunity: query.data,
    loading: query.isPending,
    error: query.error,
    notFound: query.error instanceof ApiError && query.error.status === 404,
    refetch: query.refetch,
  };
}
