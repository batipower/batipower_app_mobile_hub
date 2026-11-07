import { useQuery } from '@tanstack/react-query';

import { hubPricingApi } from '@/api/hubPricing';

import { PRICING_TAGS_KEY } from '../queryKeys';

/** Marques disponibles ; relancé quand les services sélectionnés changent (comme le web). */
export function usePricingBrands(categoryTypes: string[], enabled = true) {
  const categoryType = categoryTypes.length > 0 ? categoryTypes.join(',') : undefined;
  const query = useQuery({
    queryKey: ['hub-pricing', 'brands', categoryType ?? ''],
    queryFn: ({ signal }) => hubPricingApi.brands(categoryType, signal),
    enabled,
    staleTime: 5 * 60_000,
  });
  return { brands: query.data?.brands ?? [], loading: query.isPending, error: query.error };
}

export function usePricingTags(enabled = true) {
  const query = useQuery({
    queryKey: PRICING_TAGS_KEY,
    queryFn: ({ signal }) => hubPricingApi.tags(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
  return { tags: query.data?.tags ?? [], loading: query.isPending, error: query.error };
}

export function usePricingAffaires(enabled = true) {
  const query = useQuery({
    queryKey: ['hub-pricing', 'affaires'],
    queryFn: ({ signal }) => hubPricingApi.affaires(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
  return { affaires: query.data ?? [], loading: query.isPending, error: query.error };
}
