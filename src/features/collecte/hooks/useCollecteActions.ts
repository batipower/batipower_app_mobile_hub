import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubCollecteApi } from '@/api/hubCollecte';

import { COLLECTE_KEY } from '../queryKeys';

export type CollecteActionKind = 'collect' | 'deliver';

export type CollecteAction = {
  kind: CollecteActionKind;
  reference: string;
  /** Nombre de colis de la commande (pour le rappel dans la confirmation). */
  totalColis?: number;
};

const LABELS: Record<
  CollecteActionKind,
  { title: string; confirm: string; done: string; failed: string }
> = {
  collect: {
    title: 'Passer en « Collecté » ?',
    confirm: 'Collecter',
    done: 'Commande passée en Collecté',
    failed: 'Passage en Collecté impossible',
  },
  deliver: {
    title: 'Passer en « Livré » ?',
    confirm: 'Livrer',
    done: 'Commande passée en Livré',
    failed: 'Passage en Livré impossible',
  },
};

/**
 * Actions rapides « Collecter » / « Livrer » : une confirmation explicite, puis la commande
 * entière change de statut. Toute la collecte est rechargée ensuite. `variables` d'une mutation
 * en cours = action de la commande concernée.
 */
export function useCollecteActions() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (action: CollecteAction) =>
      action.kind === 'collect'
        ? hubCollecteApi.markCollected(action.reference)
        : hubCollecteApi.markDelivered(action.reference),
    onSuccess: (result, action) => {
      if (!result.success) {
        toast.error(result.message || LABELS[action.kind].failed);
        return;
      }
      toast.success(`${action.reference} : ${result.message || LABELS[action.kind].done}`);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      void queryClient.invalidateQueries({ queryKey: COLLECTE_KEY });
    },
    onError: (error, action) =>
      toast.error(error instanceof ApiError && error.message ? error.message : LABELS[action.kind].failed),
  });

  /** Demande confirmation puis lance l'action ; `onDone` n'est appelé qu'en cas de succès. */
  const request = (action: CollecteAction, onDone?: () => void) => {
    const colis =
      action.totalColis && action.totalColis > 1 ? ` (${action.totalColis} colis)` : '';
    Alert.alert(
      LABELS[action.kind].title,
      `Commande ${action.reference}${colis} : tous ses colis passeront en ${
        action.kind === 'collect' ? 'Collecté' : 'Livré'
      }.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: LABELS[action.kind].confirm,
          onPress: () =>
            mutation.mutate(action, {
              onSuccess: (result) => {
                if (result.success) onDone?.();
              },
            }),
        },
      ],
    );
  };

  /** Action en cours sur cette commande, sinon `null`. */
  const pendingFor = (reference: string): CollecteActionKind | null =>
    mutation.isPending && mutation.variables?.reference === reference
      ? mutation.variables.kind
      : null;

  return { request, pendingFor, isPending: mutation.isPending };
}
