/* eslint-disable react-hooks/exhaustive-deps -- les `useLatest` sont des refs stables, volontairement hors dépendances */

import { useLatest } from '../lib/useLatest';
import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import { getApiErrorMessage } from '../lib/errors';
import { hubProductStudioJobsApi, studioJobKeys } from '@/api/hubProductStudioJobs';
import { invalidateProductQuality } from '../lib/cache';
import { isStudioJobActive, studioJobStepMap } from '../domain/jobs';
import type { StudioDeployOptions, StudioJob } from '@/types/hubStudioJobs';
import { useStudioCache } from './useStudioQueries';

/**
 * Job actif du produit (préparation ou déploiement), sinon le dernier job visible par
 * l'utilisateur. Interrogé toutes les 3 s tant qu'un job est en file ou en cours.
 */
function useStudioJobQuery(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: studioJobKeys.current(reference),
    queryFn: () => hubProductStudioJobsApi.current(reference),
    enabled: enabled && reference.length > 0,
    refetchInterval: (query) => (isStudioJobActive(query.state.data?.job) ? 3000 : false),
    staleTime: 0,
  });
}

interface UseStudioJobOptions {
  reference: string;
  enabled: boolean;
  /** Préparation terminée et brouillon relu : l'appelant abandonne ses saisies locales. */
  onPrepared: () => void;
}

/**
 * Job du Studio (préparation IA ou « Valider et déployer ») exécuté par la file du serveur.
 * Le tiroir ne fait que suivre le job par polling : le fermer n'interrompt rien, et le
 * rouvrir retrouve le job en cours. À la fin d'un job suivi en direct, le brouillon est relu.
 */
export function useStudioJob({ reference, enabled, onPrepared }: UseStudioJobOptions) {
  const queryClient = useQueryClient();
  const { refetchAll } = useStudioCache(reference);
  const jobQuery = useStudioJobQuery(reference, enabled);
  const job: StudioJob | null = jobQuery.data?.job ?? null;
  const active = isStudioJobActive(job);
  const onPreparedRef = useLatest(onPrepared);

  const invalidateWebsite = useCallback(() => {
    invalidateProductQuality(queryClient, reference);
  }, [queryClient, reference]);

  const handleFinished = useCallback(
    async (finished: StudioJob) => {
      try {
        if (finished.type === 'PREPARE') {
          if (finished.status === 'DONE') {
            await refetchAll();
            // La préparation persiste la note actuelle : Pricing et onglet Site Web doivent la relire.
            invalidateWebsite();
            onPreparedRef.current();
            toast.success('Fiche préparée');
          } else if (finished.status === 'FAILED') {
            toast.error(finished.error || 'Préparation en échec');
          }
        } else {
          // Le contenu a pu être écrit même si une étape ultérieure a échoué : on relit toujours.
          await refetchAll().catch(() => undefined);
          invalidateWebsite();
          if (finished.status === 'DONE') {
            toast.success(finished.options?.forceGeo ? 'GEO recalculé et déployé' : 'Fiche validée et déployée');
          } else if (finished.status === 'PARTIAL') {
            toast.warning('Fiche déployée, une étape est à vérifier', {
              description: finished.error || finished.result?.warnings?.join(' · '),
              duration: 10000,
            });
          } else if (finished.status === 'FAILED') {
            // `refetchAll()` a déjà relu le contrôle de mise en ligne : l'assistant affiche ce qui manque.
            toast.error(finished.error || 'Déploiement en échec', { duration: 10000 });
          }
        }
      } catch {
        toast.error("Le job est terminé, mais l'écran n'a pas pu être rafraîchi");
      } finally {
        // Suivi en direct : la notification de fin serait redondante.
        if (finished.status !== 'CANCELLED') {
          hubProductStudioJobsApi
            .markSeen({ jobIds: [finished.id] })
            .then(() => queryClient.invalidateQueries({ queryKey: studioJobKeys.notifications() }))
            .catch(() => undefined);
        }
      }
    },
    [invalidateWebsite, queryClient, refetchAll],
  );

  // Détecte le passage « actif -> terminé » d'un job suivi depuis le tiroir.
  const previousRef = useRef<StudioJob | null>(null);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = job;
    if (previous && job && previous.id === job.id && isStudioJobActive(previous) && !isStudioJobActive(job)) {
      void handleFinished(job);
    }
  }, [handleFinished, job]);

  const enqueue = useMutation({
    mutationFn: (request: { type: 'PREPARE' } | { type: 'DEPLOY'; options?: StudioDeployOptions }) =>
      request.type === 'PREPARE'
        ? hubProductStudioJobsApi.prepare(reference)
        : hubProductStudioJobsApi.deploy(reference, request.options),
    onSuccess: (res) => {
      queryClient.setQueryData(studioJobKeys.current(reference), { job: res.job });
      if (!res.created) toast.info('Un traitement est déjà en cours pour ce produit');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Impossible de mettre le traitement en file')),
  });

  const startPrepare = useCallback(() => enqueue.mutateAsync({ type: 'PREPARE' }).catch(() => undefined), [enqueue]);
  /** `{ forceGeo: true }` : le GEO recalculé remplace un GEO publié plus riche. */
  const startDeploy = useCallback(
    (options?: StudioDeployOptions) => enqueue.mutateAsync({ type: 'DEPLOY', options }),
    [enqueue],
  );

  const jobSteps = job?.type === 'PREPARE' ? studioJobStepMap(job) : {};

  return {
    job,
    active,
    preparing: active && job?.type === 'PREPARE',
    deploying: active && job?.type === 'DEPLOY',
    queued: job?.status === 'QUEUED',
    queuePosition: job?.queuePosition ?? null,
    starting: enqueue.isPending,
    /** Étapes de la dernière préparation (clé -> statut). */
    prepareSteps: jobSteps as Record<string, string>,
    /** Dernier échec de préparation, pour l'écran « fiche pas encore préparée ». */
    prepareError: job?.type === 'PREPARE' && job.status === 'FAILED' ? job.error : null,
    startPrepare,
    startDeploy,
  };
}
