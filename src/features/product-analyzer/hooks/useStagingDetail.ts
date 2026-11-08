import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import type { NegotiationRequest, StagingItem } from '@/types/hubProductAnalyzer';

import { PA_LIST_KEY, paRequestsKey, paStagingKey, paViabilityKey } from '../queryKeys';

type ListPage = { items: StagingItem[] };

/**
 * Fiche d'un produit analysé. La ligne déjà chargée dans l'historique sert d'aperçu immédiat
 * (`placeholderData`) pendant que la fiche complète (snapshot d'analyse) est récupérée.
 */
export function useStagingDetail(uuid: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery<StagingItem, Error>({
    queryKey: paStagingKey(uuid ?? ''),
    queryFn: ({ signal }) => hubProductAnalyzerApi.getStaging(uuid as string, signal),
    enabled: !!uuid,
    staleTime: 15_000,
    placeholderData: () => {
      for (const [, data] of queryClient.getQueriesData<InfiniteData<ListPage>>({ queryKey: PA_LIST_KEY })) {
        const found = data?.pages.flatMap((p) => p.items).find((it) => it.uuid === uuid);
        if (found) return found;
      }
      return undefined;
    },
  });
}

/** Viabilité du produit sur les autres plateformes (ManoMano, Leroy Merlin, Castorama…). */
export function useMarketplaceViability(uuid: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: paViabilityKey(uuid ?? ''),
    queryFn: ({ signal }) => hubProductAnalyzerApi.getMarketplaceViability(uuid as string, signal),
    enabled: !!uuid && enabled,
    staleTime: 60_000,
    retry: false,
  });
}

/** Demandes (négo / DEP) d'un produit, par entrepôt et fournisseur. */
export function useStagingNegoRequests(uuid: string | undefined) {
  return useQuery({
    queryKey: [...paRequestsKey(uuid ?? ''), 'detail'],
    queryFn: async ({ signal }): Promise<NegotiationRequest[]> =>
      (await hubProductAnalyzerApi.getNegotiationRequests([uuid as string], signal))[uuid as string] ?? [],
    enabled: !!uuid,
    staleTime: 15_000,
  });
}
