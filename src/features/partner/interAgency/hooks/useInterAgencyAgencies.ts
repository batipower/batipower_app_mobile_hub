import { useQuery } from '@tanstack/react-query';

import { partnerInterAgencyApi } from '@/api/partnerInterAgency';

import { PARTNER_INTER_AGENCY_AGENCIES_KEY } from '../../queryKeys';

/** Agences à prévenir quand une inter-agence est réalisée (liste stable, gardée 5 minutes). */
export function useInterAgencyAgencies() {
  return useQuery({
    queryKey: PARTNER_INTER_AGENCY_AGENCIES_KEY,
    queryFn: ({ signal }) => partnerInterAgencyApi.listAgencies({ signal }),
    staleTime: 5 * 60_000,
  });
}
