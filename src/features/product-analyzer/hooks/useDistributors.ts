import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { hubProductAnalyzerApi, type HubDistributor } from '@/api/hubProductAnalyzer';

import { PA_DISTRIBUTORS_KEY } from '../queryKeys';

const FALLBACK: HubDistributor[] = [
  { id: 'fallback-mequisa', name: 'Flevy', slug: 'mequisa', legacyWarehouse: 'FLEVY', ebatproWarehouse: 'FLEVY', ready: true, missing: [] },
  { id: 'fallback-aubade', name: 'Dombasle', slug: 'aubade', legacyWarehouse: 'DOMBASLE', ebatproWarehouse: 'DOMBASLE', ready: true, missing: [] },
];

/**
 * Distributeurs actifs (liste dynamique `PartnerDistributor`) pour les sélecteurs du HUB.
 * Repli Flevy / Dombasle tant que la liste n'est pas chargée (ou si l'API est indisponible).
 */
export function useDistributors(options: { enabled?: boolean } = {}) {
  const query = useQuery({
    queryKey: PA_DISTRIBUTORS_KEY,
    queryFn: ({ signal }) => hubProductAnalyzerApi.listDistributors(signal),
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
  const distributors = query.data && query.data.length > 0 ? query.data : FALLBACK;
  return useMemo(
    () => ({
      distributors,
      /** Distributeurs interrogeables via eBatPro (entrepôt rattaché). */
      withWarehouse: distributors.filter((d) => !!d.ebatproWarehouse),
      byId: (id: string | null | undefined) => distributors.find((d) => d.id === id) ?? null,
      byWarehouse: (wh: string | null | undefined) =>
        distributors.find((d) => d.ebatproWarehouse === wh || d.legacyWarehouse === wh) ?? null,
      isLoading: query.isLoading,
      error: query.error,
      refetch: query.refetch,
    }),
    [distributors, query.isLoading, query.error, query.refetch],
  );
}
