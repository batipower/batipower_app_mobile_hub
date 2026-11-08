import { useQuery } from '@tanstack/react-query';

import { partnerProductsApi } from '@/api/partnerProducts';
import { ApiError } from '@/api/client';

import { partnerProductDetailKey } from '../../queryKeys';

/** Fiche d'un produit PARTNER (`buyer-app/products/:reference`). */
export function useProductDetail(reference: string | undefined) {
  const query = useQuery({
    queryKey: partnerProductDetailKey(reference ?? ''),
    queryFn: ({ signal }) => partnerProductsApi.detail(reference as string, { signal }),
    enabled: !!reference,
    select: (response) => response.product,
    staleTime: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  return {
    product: query.data,
    loading: query.isPending,
    error: query.error,
    notFound: query.error instanceof ApiError && query.error.status === 404,
    refetch: query.refetch,
  };
}
