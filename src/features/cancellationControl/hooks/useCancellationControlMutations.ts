import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubCancellationControlApi } from '@/api/hubCancellationControl';

import { CANCELLATION_CONTROL_KEY } from '../queryKeys';

function errorText(error: unknown): string {
  return error instanceof ApiError && error.message ? error.message : 'Erreur';
}

/**
 * Actions du contrôle des annulations, avec les mêmes messages que la page web. Chaque succès
 * invalide toutes les vues. `variables` d'une mutation en cours = id de la ligne concernée.
 */
export function useCancellationControlMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: CANCELLATION_CONTROL_KEY });
  const success = () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  const onError = (error: unknown) => toast.error(errorText(error));

  const recheck = useMutation({
    mutationFn: (id: string) => hubCancellationControlApi.recheck(id),
    onSuccess: (item) => {
      if (item.controlStatus === 'REMOVED') {
        toast.success('BL supprimé dans eBatPro — alerte résolue');
        success();
      } else if (item.controlStatus === 'ERROR') {
        toast.error(item.message || 'Contrôle eBatPro impossible');
      } else if (item.controlStatus === 'NOT_APPLICABLE') {
        toast.info('Entrepôt hors eBatPro — rien à contrôler');
      } else {
        toast.info('Commande toujours présente dans eBatPro');
      }
      void invalidate();
    },
    onError,
  });

  const ignore = useMutation({
    mutationFn: (vars: { id: string; comment: string }) =>
      hubCancellationControlApi.ignore(vars.id, vars.comment),
    onSuccess: () => {
      toast.success('Alerte ignorée');
      success();
      void invalidate();
    },
    onError,
  });

  const validateCreditNote = useMutation({
    mutationFn: (id: string) => hubCancellationControlApi.validateCreditNote(id),
    onSuccess: () => {
      toast.success('Avoir validé — alerte résolue');
      success();
      void invalidate();
    },
    onError,
  });

  const reviewCreditNote = useMutation({
    mutationFn: (id: string) => hubCancellationControlApi.reviewCreditNote(id),
    onSuccess: () => {
      toast.success('Déclaration validée — retrouvez-la dans l’onglet « Validées »');
      success();
      void invalidate();
    },
    onError,
  });

  const unreviewCreditNote = useMutation({
    mutationFn: (id: string) => hubCancellationControlApi.unreviewCreditNote(id),
    onSuccess: () => {
      toast.success('Déclaration remise à revoir');
      void invalidate();
    },
    onError,
  });

  return { recheck, ignore, validateCreditNote, reviewCreditNote, unreviewCreditNote };
}
