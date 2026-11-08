import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubCancellationControlApi, type HubCancellationControlView } from '@/api/hubCancellationControl';

import { cancellationControlListKey } from '../queryKeys';

/**
 * Une vue du contrôle des annulations (`pending`, `history` ou `reviewed`). La vue `pending`
 * porte aussi les contrôles en erreur (`errors`) et le compteur d'avoirs à valider. Rafraîchie
 * toutes les minutes, comme la page web.
 */
export function useCancellationControlList(status: HubCancellationControlView, enabled = true) {
  return useQuery({
    queryKey: cancellationControlListKey(status),
    queryFn: ({ signal }) => hubCancellationControlApi.list(status, { signal }),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
