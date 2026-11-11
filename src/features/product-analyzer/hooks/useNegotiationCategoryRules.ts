import { useQuery } from '@tanstack/react-query';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';

import { PA_CATEGORY_RULES_KEY } from '../queryKeys';

export const negotiationCategoryRulesQuery = {
  queryKey: PA_CATEGORY_RULES_KEY,
  queryFn: ({ signal }: { signal?: AbortSignal }) => hubProductAnalyzerApi.categoryRules(signal),
  staleTime: 5 * 60_000,
} as const;

/**
 * Règles de service de chaque filiale (préfixe du code interne -> service). Tolérant : si l'API est
 * indisponible, `data` reste vide et la négociation retombe sur le jeu par défaut (1re lettre).
 */
export function useNegotiationCategoryRules() {
  return useQuery({ ...negotiationCategoryRulesQuery, retry: 1 });
}
