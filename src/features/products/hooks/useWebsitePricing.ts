import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { hubProductWebsiteApi } from '@/api/hubProductWebsite';

export const websitePricingKey = (reference: string | undefined) =>
  ['hub-product-website-pricing', reference] as const;

/**
 * Prix site d'un produit (prix TTC, marge). `enabled` est faux pour les comptes sans droit
 * (hors SUPERADMIN) : aucun appel n'est alors envoyé.
 */
export function useWebsitePricing(reference: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: websitePricingKey(reference),
    queryFn: ({ signal }) => hubProductWebsiteApi.getPricing(reference ?? '', signal),
    enabled: enabled && !!reference,
    staleTime: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
  });
}
