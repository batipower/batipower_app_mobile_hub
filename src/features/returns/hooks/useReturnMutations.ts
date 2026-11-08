import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import {
  hubReturnsApi,
  type ReceiveReturnBody,
  type ReturnBrokenCause,
  type ReturnItemCondition,
  type ReturnPackagingCondition,
} from '@/api/hubReturns';

import { RETURNS_KEY } from '../queryKeys';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

/**
 * Actions du poste retour. Le back répond 200 avec `success: false` pour un échec métier : chaque
 * mutation affiche alors le message du back sans lever d'exception : l'appelant lit `res.success`.
 * Chaque succès invalide l'historique et les fiches.
 */
export function useReturnMutations(reference: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: RETURNS_KEY });
  const success = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

  const receive = useMutation({
    mutationFn: (body: ReceiveReturnBody) => hubReturnsApi.receive(reference, body),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || 'Aucune étiquette ou retour marketplace à vérifier');
        return;
      }
      if (res.alreadyExists) toast.info(res.message || 'Retour point relais déjà enregistré');
      else toast.success(res.message || 'Retour reçu et enregistré');
      success();
      void invalidate();
    },
    onError: (error) => toast.error(errorText(error, 'Erreur lors de la réception du retour')),
  });

  const updateCondition = useMutation({
    mutationFn: (vars: { condition: ReturnItemCondition; brokenCause: ReturnBrokenCause | null }) =>
      hubReturnsApi.updateCondition(reference, {
        condition: vars.condition,
        brokenCause: vars.brokenCause ?? undefined,
      }),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || 'Mise à jour impossible');
        return;
      }
      toast.success('État du retour enregistré');
      success();
      void invalidate();
    },
    onError: (error) => toast.error(errorText(error, "Erreur lors de la mise à jour de l'état")),
  });

  const updatePackaging = useMutation({
    mutationFn: async (vars: {
      value: ReturnPackagingCondition | null;
      /** État d'article déjà enregistré, pour la règle « emballage ouvert → non revendable ». */
      recordedCondition: ReturnItemCondition | null;
    }) => {
      const res = await hubReturnsApi.updatePackaging(reference, { packagingCondition: vars.value });
      // Emballage d'origine ouvert non revendable : le statut passe à « Non revendable », sauf s'il
      // est déjà cassé ou non revendable (on n'écrase pas une casse qualifiée). Décocher
      // l'emballage ne modifie jamais le statut.
      if (
        res.success &&
        vars.value === 'OPENED_NOT_RESELLABLE' &&
        vars.recordedCondition !== 'BROKEN' &&
        vars.recordedCondition !== 'NOT_RESELLABLE'
      ) {
        try {
          const conditionRes = await hubReturnsApi.updateCondition(reference, {
            condition: 'NOT_RESELLABLE',
          });
          if (conditionRes.success) toast.info('Statut du retour passé à « Non revendable »');
        } catch {
          toast.warning("Emballage enregistré, mais le statut « Non revendable » n'a pas pu être appliqué");
        }
      }
      return res;
    },
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || 'Mise à jour impossible');
        return;
      }
      void Haptics.selectionAsync().catch(() => undefined);
      void invalidate();
    },
    onError: (error) => toast.error(errorText(error, "Erreur lors de la mise à jour de l'emballage")),
  });

  const updateNote = useMutation({
    mutationFn: (content: string) => hubReturnsApi.updateNote(reference, { content }),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || "Impossible d'enregistrer la remarque");
        return;
      }
      toast.success(res.message || 'Remarque enregistrée');
      success();
      void invalidate();
    },
    onError: (error) => toast.error(errorText(error, "Erreur lors de l'enregistrement de la remarque")),
  });

  const undoReceive = useMutation({
    mutationFn: () => hubReturnsApi.undoReceive(reference),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || "Erreur lors de l'annulation");
        return;
      }
      toast.success('Réception annulée : vous pouvez recommencer');
      void invalidate();
    },
    onError: (error) => toast.error(errorText(error, "Erreur lors de l'annulation de la réception")),
  });

  return { receive, updateCondition, updatePackaging, updateNote, undoReceive };
}
