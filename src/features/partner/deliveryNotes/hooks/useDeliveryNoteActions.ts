import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { partnerDeliveryNotesApi } from '@/api/partnerDeliveryNotes';
import { errorMessage } from '@/features/preparation/components/ListState';

import { PARTNER_DELIVERY_NOTES_KEY } from '../../queryKeys';

/**
 * Traiter ou rouvrir un BL. Le statut est porté par le BL et partagé par tout le service : un
 * succès recale les lignes, la fiche, la progression et le badge de l'onglet (même préfixe).
 */
export function useDeliveryNoteActions(uuid: string) {
  const queryClient = useQueryClient();
  const settle = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: PARTNER_DELIVERY_NOTES_KEY });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    toast.success(message);
  };

  const treat = useMutation({
    mutationFn: () => partnerDeliveryNotesApi.markTreated(uuid),
    onSuccess: () => settle('BL marqué traité'),
    onError: (error) => toast.error(errorMessage(error, 'Impossible de marquer le BL traité.')),
  });

  const untreat = useMutation({
    mutationFn: () => partnerDeliveryNotesApi.unmarkTreated(uuid),
    onSuccess: () => settle('BL rouvert'),
    onError: (error) => toast.error(errorMessage(error, 'Impossible de rouvrir le BL.')),
  });

  return { treat, untreat };
}
