import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { hubPricingApi } from '@/api/hubPricing';
import type { HubPricingPage, HubPricingRow } from '@/types/hubPricing';

import { DEFAULT_FILTERS } from '../filters';
import { PRICING_LIST_KEY } from '../queryKeys';

export const pricingRowKey = (reference: string) => ['hub-pricing', 'row', reference] as const;

/**
 * Ligne Pricing d'une référence : lue d'abord dans les listes déjà chargées (affichage
 * immédiat, sans appel), sinon récupérée par recherche exacte sur la référence.
 */
export function usePricingRow(reference: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: pricingRowKey(reference ?? ''),
    enabled: !!reference,
    initialData: () => {
      const lists = queryClient.getQueriesData<InfiniteData<HubPricingPage>>({
        queryKey: PRICING_LIST_KEY,
      });
      for (const [, data] of lists) {
        for (const page of data?.pages ?? []) {
          const found = page.data.find((row) => row.reference === reference);
          if (found) return found;
        }
      }
      return undefined;
    },
    queryFn: async ({ signal }): Promise<HubPricingRow | null> => {
      const page = await hubPricingApi.list(
        { ...DEFAULT_FILTERS, search: reference ?? '', limit: 20 },
        { signal },
      );
      return page.data.find((row) => row.reference === reference) ?? null;
    },
    staleTime: 60_000,
  });

  return {
    row: query.data ?? null,
    loading: query.isPending,
    notFound: query.isSuccess && query.data == null,
    error: query.error,
    refetch: query.refetch,
  };
}
