import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { hubProductMarketplacesApi } from '@/api/hubProductMarketplaces';

export const productPricingKey = (reference: string | undefined) =>
  ['hub-product-pricing', reference] as const;

/**
 * Prix et marketplaces de la fiche (`GET .../pricing`, SUPERADMIN et MANAGER). Chargé quand
 * l'onglet Marketplaces est ouvert : `enabled` est faux sur l'onglet Fiche. Les données de
 * BuyBox sont rafraîchies côté back, d'où une fraîcheur courte.
 */
export function useProductPricing(reference: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: productPricingKey(reference),
    queryFn: ({ signal }) => hubProductMarketplacesApi.getPricing(reference ?? '', signal),
    enabled: enabled && !!reference,
    staleTime: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}
