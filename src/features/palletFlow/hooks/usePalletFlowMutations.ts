import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubPalletFlowApi } from '@/api/hubPalletFlow';
import { orderDetailKey } from '@/features/orders/hooks/useOrderDetail';

import { PALLET_FLOW_ROOT_KEY } from '../queryKeys';

function errorText(error: unknown): string {
  return error instanceof ApiError && error.message ? error.message : 'Erreur';
}

/**
 * Les deux décisions d'arbitrage d'une commande candidate : demander le prix palette, ou revenir
 * au flux classique. Chaque succès rafraîchit la fiche, les devis, la marge et la liste.
 */
export function usePalletFlowMutations(reference: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: PALLET_FLOW_ROOT_KEY }),
      queryClient.invalidateQueries({ queryKey: orderDetailKey(reference) }),
    ]);
  const success = () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  const onError = (error: unknown) => toast.error(errorText(error));

  const requestQuote = useMutation({
    mutationFn: (vars: { warehouse: string; comment?: string }) =>
      hubPalletFlowApi.requestQuote({
        orderReference: reference,
        warehouse: vars.warehouse,
        requesterComment: vars.comment?.trim() || undefined,
      }),
    onSuccess: (result) => {
      if (result.alreadyPending) {
        toast.info('Une demande est déjà en attente de réponse');
      } else {
        toast.success('Demande de prix palette envoyée');
        success();
      }
      void invalidate();
    },
    onError,
  });

  const revertToClassic = useMutation({
    mutationFn: () => hubPalletFlowApi.revertToClassic(reference),
    onSuccess: () => {
      toast.success('Commande renvoyée en flux classique');
      success();
      void invalidate();
    },
    onError,
  });

  return { requestQuote, revertToClassic };
}
