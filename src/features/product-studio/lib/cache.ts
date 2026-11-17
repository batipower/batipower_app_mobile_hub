import type { QueryClient } from '@tanstack/react-query';

import { PRICING_LIST_KEY } from '@/features/pricing/queryKeys';

/**
 * La note qualité d'un produit a changé côté serveur (écriture, préparation, images…) :
 * les scores du Studio et la liste Pricing doivent être relus.
 */
export function invalidateProductQuality(queryClient: QueryClient, reference: string): void {
  void queryClient.invalidateQueries({ queryKey: ['hub-product', reference, 'studio', 'scores'] });
  void queryClient.invalidateQueries({ queryKey: PRICING_LIST_KEY });
}
