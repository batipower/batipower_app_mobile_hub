import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { partnerInterAgencyApi } from '@/api/partnerInterAgency';
import { errorMessage } from '@/features/preparation/components/ListState';
import type {
  InterAgencyAgencyInput,
  InterAgencyField,
  InterAgencyImpossibleReason,
} from '@/types/partnerInterAgency';

import { PARTNER_INTER_AGENCY_KEY } from '../../queryKeys';

/**
 * Actions d'une commande inter-agence : réalisée, pré-réception et impossibilité d'honorer. Un
 * succès recale la liste ; les déclarations alertent le HUB côté back.
 */
export function useInterAgencyActions(orderReference: string, warehouse: string) {
  const queryClient = useQueryClient();
  const settle = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: PARTNER_INTER_AGENCY_KEY });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    toast.success(message);
  };
  const fail = (fallback: string) => (error: unknown) => toast.error(errorMessage(error, fallback));

  const toggle = useMutation({
    mutationFn: (payload: {
      field: InterAgencyField;
      value: boolean;
      comment?: string;
      agencies?: InterAgencyAgencyInput[];
    }) => partnerInterAgencyApi.toggle({ orderReference, warehouse, ...payload }),
    onSuccess: (_order, { field, value }) =>
      settle(
        field === 'interAgencyDone'
          ? value
            ? 'Inter-agence réalisée'
            : 'Inter-agence annulée'
          : value
            ? 'Pré-réception signalée'
            : 'Pré-réception annulée',
      ),
    onError: fail('Impossible de mettre à jour la commande.'),
  });

  const setImpossible = useMutation({
    mutationFn: (payload: {
      value: boolean;
      reason?: InterAgencyImpossibleReason;
      comment?: string;
    }) => partnerInterAgencyApi.setImpossible({ orderReference, warehouse, ...payload }),
    onSuccess: (_order, { value }) =>
      settle(
        value
          ? 'Inter-agence déclarée impossible : le HUB a été alerté'
          : "Impossibilité annulée, l'inter-agence repart dans le circuit",
      ),
    onError: fail('Impossible de mettre à jour la commande.'),
  });

  return { toggle, setImpossible };
}
