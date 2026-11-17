import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import {
  hubProductStudioJobsApi,
  STUDIO_JOBS_QUERY_KEY,
  studioJobKeys,
} from '@/api/hubProductStudioJobs';
import type {
  StudioJob,
  StudioQueueOverview,
  StudioReviewItem,
  StudioReviewResponse,
} from '@/types/hubStudioJobs';

import { buildDeployRecap } from '../domain/model';

const errorText = (e: unknown) => (e instanceof ApiError && e.message ? e.message : 'Erreur');

/** Retire des fiches de la relecture en cache : la carte disparaît sans attendre le rafraîchissement. */
export function removeFromReviewCache(
  queryClient: ReturnType<typeof useQueryClient>,
  references: readonly string[],
) {
  const gone = new Set(references);
  queryClient.setQueryData<StudioReviewResponse>(studioJobKeys.review(), (old) => {
    if (!old) return old;
    const items = old.items.filter((i) => !gone.has(i.reference));
    return { ...old, items, count: items.length };
  });
}

/** Ajoute le job tout juste créé à « En file » pour que la carte passe en traitement sur place. */
export function addQueuedJobToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  job: StudioJob,
) {
  queryClient.setQueryData<StudioQueueOverview>(studioJobKeys.queue(), (old) =>
    old && !old.queued.some((j) => j.id === job.id) && !old.running.some((j) => j.id === job.id)
      ? { ...old, queued: [...old.queued, job] }
      : old,
  );
}

/**
 * Actions de la file « À traiter » : déployer, reprendre, écarter, déployer les fiches prêtes.
 * Chaque action destructrice ou lourde passe par une confirmation.
 */
export function useQueueActions() {
  const queryClient = useQueryClient();
  const invalidate = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: STUDIO_JOBS_QUERY_KEY }),
    [queryClient],
  );

  const deployMutation = useMutation({
    mutationFn: (reference: string) => hubProductStudioJobsApi.deploy(reference),
    onSuccess: (res) => {
      toast.success(
        res.created
          ? 'Déploiement mis en file'
          : 'Un traitement est déjà en cours pour cette fiche',
      );
      addQueuedJobToCache(queryClient, res.job);
      invalidate();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const prepareMutation = useMutation({
    mutationFn: (reference: string) => hubProductStudioJobsApi.prepare(reference),
    onSuccess: (res) => {
      toast.success(
        res.created
          ? 'Préparation mise en file'
          : 'Un traitement est déjà en cours pour cette fiche',
      );
      invalidate();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const dismissReviewMutation = useMutation({
    mutationFn: async (items: StudioReviewItem[]) => {
      const results = await Promise.allSettled(
        items.map((item) => hubProductStudioJobsApi.dismissReview(item.reference)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`${failed} fiche(s) sur ${results.length} n'ont pas pu être écartées`);
      }
      return results.length;
    },
    onSuccess: (count, items) => {
      toast.success(count > 1 ? `${count} fiches écartées de la liste` : 'Fiche écartée de la liste');
      removeFromReviewCache(
        queryClient,
        items.map((i) => i.reference),
      );
      invalidate();
    },
    onError: (e) => {
      toast.error(errorText(e));
      invalidate();
    },
  });

  const dismissJobMutation = useMutation({
    mutationFn: (job: StudioJob) => hubProductStudioJobsApi.dismissJob(job.id),
    onSuccess: () => {
      toast.success('Échec écarté de la liste');
      invalidate();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const deployReadyMutation = useMutation({
    mutationFn: (references: string[]) =>
      hubProductStudioJobsApi.deployReady({
        references,
        limit: Math.min(Math.max(references.length, 1), 500),
      }),
    onSuccess: (res) => {
      const parts = [`${res.created} déploiement${res.created > 1 ? 's' : ''} mis en file`];
      if (res.alreadyActive > 0) parts.push(`${res.alreadyActive} déjà en cours`);
      toast.success(parts.join(' · '));
      // Une fiche devenue bloquée depuis le dernier contrôle est refusée : on dit pourquoi.
      const blocked = res.blocked ?? [];
      const failed = res.failed ?? [];
      const lines: string[] = [];
      if (blocked.length > 0) {
        lines.push(
          `${blocked.length} fiche${blocked.length > 1 ? 's' : ''} non déployée${blocked.length > 1 ? 's' : ''} :\n` +
            blocked
              .slice(0, 5)
              .map((b) => `• ${b.reference} (${(b.reasons ?? []).join(' · ')})`)
              .join('\n') +
            (blocked.length > 5 ? '\n…' : ''),
        );
      }
      if (failed.length > 0) {
        lines.push(
          `${failed.length} fiche${failed.length > 1 ? 's' : ''} en erreur : ${failed[0]?.reference} (${failed[0]?.reason})`,
        );
      }
      if (lines.length > 0) Alert.alert('Déploiement groupé', lines.join('\n\n'));
      invalidate();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  /** Confirmation « Valider et déployer » d'une fiche de la liste. */
  const confirmDeploy = useCallback(
    (reference: string) => {
      Alert.alert(
        `Valider et déployer ${reference}`,
        `En arrière-plan : le contenu est écrit sur PrestaShop, le GEO publié sur le site, le produit mis en ligne puis déployé sur Google Merchant.\n\n${buildDeployRecap()
          .map((line) => `• ${line}`)
          .join('\n')}`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Valider et déployer', onPress: () => deployMutation.mutate(reference) },
        ],
      );
    },
    [deployMutation],
  );

  const confirmDismissReview = useCallback(
    (items: StudioReviewItem[]) => {
      const first = items[0];
      if (!first) return;
      const title =
        items.length > 1 ? `Écarter ${items.length} fiches ?` : `Écarter ${first.reference} ?`;
      const applied = items.some((i) => i.stage === 'TO_ACTIVATE');
      const text =
        "La fiche disparaît de « À traiter ». Rien n'est supprimé : une nouvelle préparation la fera réapparaître." +
        (applied
          ? "\n\nLe contenu est déjà appliqué sur PrestaShop : il y reste, le produit n'est simplement pas mis en ligne."
          : '');
      Alert.alert(title, text, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Écarter',
          style: 'destructive',
          onPress: () => dismissReviewMutation.mutate(items),
        },
      ]);
    },
    [dismissReviewMutation],
  );

  const confirmDismissJob = useCallback(
    (job: StudioJob) => {
      Alert.alert(
        `Écarter ${job.reference} ?`,
        "Cet échec disparaît de la liste. Aucune donnée du site n'est modifiée.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Écarter', style: 'destructive', onPress: () => dismissJobMutation.mutate(job) },
        ],
      );
    },
    [dismissJobMutation],
  );

  const confirmDeployReady = useCallback(
    (items: StudioReviewItem[]) => {
      const n = items.length;
      Alert.alert(
        `Déployer ${n} fiche${n > 1 ? 's' : ''} prête${n > 1 ? 's' : ''} ?`,
        `Chaque fiche est recontrôlée juste avant d'être mise en file : une fiche devenue bloquée entre-temps est refusée, avec la raison. Le déploiement se fait en arrière-plan.\n\n${buildDeployRecap()
          .map((line) => `• ${line}`)
          .join('\n')}`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: `Déployer ${n} fiche${n > 1 ? 's' : ''}`,
            onPress: () => deployReadyMutation.mutate(items.map((i) => i.reference)),
          },
        ],
      );
    },
    [deployReadyMutation],
  );

  /** « Reprendre » une fiche en échec : nouvelle préparation, ou déploiement après confirmation. */
  const retry = useCallback(
    (job: StudioJob, known?: StudioReviewItem) => {
      if (job.type === 'DEPLOY') {
        if (known) confirmDeploy(known.reference);
        else deployMutation.mutate(job.reference);
        return;
      }
      prepareMutation.mutate(job.reference);
    },
    [confirmDeploy, deployMutation, prepareMutation],
  );

  const pendingReference =
    (prepareMutation.isPending ? prepareMutation.variables : undefined) ??
    (deployMutation.isPending ? deployMutation.variables : undefined);

  return {
    confirmDeploy,
    confirmDismissReview,
    confirmDismissJob,
    confirmDeployReady,
    prepareMutation,
    deployMutation,
    deployReadyPending: deployReadyMutation.isPending,
    dismissPending: dismissReviewMutation.isPending || dismissJobMutation.isPending,
    retry,
    pendingReference,
  };
}
