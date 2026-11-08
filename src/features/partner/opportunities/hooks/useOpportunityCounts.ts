import { useQuery } from '@tanstack/react-query';

import { partnerOpportunitiesApi } from '@/api/partnerOpportunities';
import type { PartnerOpportunityScope } from '@/types/partnerOpportunities';

import { PARTNER_OPPORTUNITIES_KEY } from '../../queryKeys';

/** Compteurs par statut du périmètre ; « Toutes » est leur somme. */
export function useOpportunityCounts(scope: PartnerOpportunityScope) {
  return useQuery({
    queryKey: [...PARTNER_OPPORTUNITIES_KEY, 'counts', scope],
    queryFn: ({ signal }) => partnerOpportunitiesApi.countsByStatus(scope, { signal }),
    select: (counts): Record<string, number> => ({
      ...counts,
      ALL: Object.values(counts).reduce((sum, value) => sum + value, 0),
    }),
    staleTime: 30_000,
  });
}
