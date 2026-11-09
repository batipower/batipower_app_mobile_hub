import { useQuery } from '@tanstack/react-query';

import { hubPalletFlowApi } from '@/api/hubPalletFlow';

import { palletCandidatesKey } from '../queryKeys';

/** Commandes candidates palette à arbitrer, rafraîchies toutes les minutes. */
export function usePalletCandidates(enabled = true) {
  return useQuery({
    queryKey: palletCandidatesKey(),
    queryFn: ({ signal }) => hubPalletFlowApi.listCandidates(signal),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
