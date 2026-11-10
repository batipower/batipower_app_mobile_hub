import { useIsFocused } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubCollecteApi } from '@/api/hubCollecte';
import type { CollecteMinHours, CollecteWarehouse } from '@/types/hubCollecte';

import { COLLECTE_REFRESH_MS } from '../display';
import { collecteUncollectedKey } from '../queryKeys';

/**
 * Colis expédiés non collectés d'un entrepôt, au-delà d'un seuil d'ancienneté. Les chiffres
 * précédents restent affichés pendant un changement de filtre ; l'actualisation automatique
 * (comme sur le web) ne tourne que sur l'écran visible.
 */
export function useCollecteUncollected(warehouse: CollecteWarehouse, minHours: CollecteMinHours) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: collecteUncollectedKey(warehouse, minHours),
    queryFn: ({ signal }) => hubCollecteApi.uncollected(warehouse, minHours, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: focused ? COLLECTE_REFRESH_MS : false,
    staleTime: 8_000,
  });
}
