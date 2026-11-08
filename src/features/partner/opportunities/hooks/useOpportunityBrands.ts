import { useQuery } from '@tanstack/react-query';

import { partnerOpportunitiesApi } from '@/api/partnerOpportunities';
import type { PartnerOpportunityScope } from '@/types/partnerOpportunities';

import { PARTNER_OPPORTUNITIES_KEY } from '../../queryKeys';

/** Marques des opportunités du périmètre, pour le filtre de marque. */
export function useOpportunityBrands(scope: PartnerOpportunityScope) {
  return useQuery({
    queryKey: [...PARTNER_OPPORTUNITIES_KEY, 'brands', scope],
    queryFn: ({ signal }) => partnerOpportunitiesApi.listBrands(scope, { signal }),
    staleTime: 5 * 60_000,
  });
}
