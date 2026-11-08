import { useQuery } from '@tanstack/react-query';

import { getQuoteRequestCounts } from '@/api/hubCustomerQuotes';

import { QUOTES_PENDING_KEY } from '../queryKeys';

/** Intervalle de rafraîchissement du badge : la notification push reste le canal principal. */
const PENDING_REFETCH_MS = 60_000;

/**
 * Nombre de demandes de devis en attente, pour le badge de l'onglet Devis. Rafraîchi toutes les
 * minutes (suspendu en arrière-plan) et au retour au premier plan : le `focusManager` de
 * `api/queryClient.ts` recharge les requêtes périmées, d'où `staleTime: 0`.
 */
export function usePendingQuoteRequests(enabled: boolean) {
  const query = useQuery({
    queryKey: QUOTES_PENDING_KEY,
    queryFn: () => getQuoteRequestCounts(),
    refetchInterval: PENDING_REFETCH_MS,
    staleTime: 0,
    enabled,
  });
  return query.data?.pending ?? 0;
}
