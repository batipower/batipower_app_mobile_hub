import { useQuery } from '@tanstack/react-query';

import { partnerProductsApi } from '@/api/partnerProducts';
import type { PartnerDepWarehouse } from '@/types/partnerProducts';

import { PARTNER_PRODUCTS_KEY } from '../../queryKeys';
import type { ProductSegment } from '../filtersStore';

/** Marques proposées au filtre, selon le périmètre (standard ou DEP, et entrepôt DEP). */
export function useProductBrands(segment: ProductSegment, depWarehouse: PartnerDepWarehouse | null) {
  return useQuery({
    queryKey: [...PARTNER_PRODUCTS_KEY, 'brands', segment, depWarehouse],
    queryFn: ({ signal }) =>
      partnerProductsApi.facets(
        { dep: segment === 'dep', depWarehouse: depWarehouse ?? undefined },
        { signal },
      ),
    select: (facets) => facets.brands,
    staleTime: 5 * 60_000,
  });
}
