
import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import { getApiErrorMessage } from '../lib/errors';
import { hubProductStudioApi } from '@/api/hubProductStudio';
import { invalidateProductQuality } from '../lib/cache';
import {
  buildApplyDetails,
  buildDeployRecap,
  canDeployToSite,
  latestRollbackLog,
  MIN_DEPLOY_SCORE,
} from '../domain/model';
import type { StudioDraft, StudioScores } from '@/types/hubStudio';
import type { StudioDeployOptions, StudioJobEnqueueResponse } from '@/types/hubStudioJobs';
import { studioKeys, useStudioCache } from './useStudioQueries';

export interface StudioConfirmState {
  title: string;
  message: string;
  details: string[];
  confirmLabel: string;
  tone: 'primary' | 'danger';
  action: () => Promise<boolean>;
}

interface UseStudioPublishFlowOptions {
  reference: string;
  draft: StudioDraft | null;
  scores: StudioScores | undefined;
  /** Un job de la file (préparation ou déploiement) est en file ou en cours pour ce produit. */
  jobBusy: boolean;
  /** Met le déploiement complet en file (le serveur écrit, publie le GEO, met en ligne et déploie Merchant). */
  startDeploy: (options?: StudioDeployOptions) => Promise<StudioJobEnqueueResponse>;
  /** Recalcule le GEO du brouillon (IA) : met aussi à jour le brouillon et le score projeté. */
  refreshGeo: () => Promise<StudioDraft>;
  flushAll: () => Promise<boolean>;
  getPendingEdits: () => Record<string, string>;
  getAttributeNames: () => string[];
  hasUnsavedWork: () => boolean;
  /** Appelé une fois le déploiement mis en file (relecture en série). */
  onDeployQueued?: () => void;
}

/**
 * Cycle d'écriture du Studio : « Prévisualiser les changements » (synchrone, rien n'est écrit),
 * « Valider et déployer » (en file : contenu PrestaShop + GEO + mise en ligne + Google Merchant),
 * « Recalculer et déployer » (recalcul du GEO puis même déploiement, GEO publié de force) et
 * Annuler la dernière écriture. Chaque action irréversible passe par une confirmation.
 */
export function useStudioPublishFlow({
  reference,
  draft,
  scores,
  jobBusy,
  startDeploy,
  refreshGeo,
  flushAll,
  getPendingEdits,
  getAttributeNames,
  hasUnsavedWork,
  onDeployQueued,
}: UseStudioPublishFlowOptions) {
  const queryClient = useQueryClient();
  const { refetchAll } = useStudioCache(reference);
  const [confirm, setConfirm] = useState<StudioConfirmState | null>(null);
  const [confirming, setConfirming] = useState(false);

  const deployScore = scores?.current?.score ?? draft?.currentScore?.score;
  // Même source que `deployScore` : la note et sa lettre ne doivent jamais venir de deux calculs différents.
  const deployGrade = scores?.current ? scores.current.grade : draft?.currentScore?.grade;
  const projectedScore = scores?.projected?.score ?? draft?.projectedScore?.score;
  const gate = scores?.gate ?? null;
  // L'écriture du contenu précède la mise en ligne dans le même job : c'est le score projeté qui compte.
  // Le serveur recontrôle le score réel une fois le contenu écrit.
  const scoreOk = canDeployToSite(deployScore) || canDeployToSite(projectedScore);
  // Le serveur fait foi (images, attributs, originalité, score, produit vendable) ; sans son verdict, on garde le score seul.
  const readiness = scores?.readiness ?? null;
  const readinessOk = readiness ? readiness.ok : scoreOk;
  const deployBlockers = useMemo(
    () => (readiness && !readiness.ok ? readiness.blockers : []),
    [readiness],
  );
  const canDeploy = readinessOk && !jobBusy;
  const blocking = Boolean(draft?.uniqueness?.blocking);

  /** Le score et l'état « actif » de l'onglet Qualité dépendent de ce qui vient d'être écrit. */
  const invalidateWebsite = useCallback(() => {
    invalidateProductQuality(queryClient, reference);
  }, [queryClient, reference]);

  const simulateMutation = useMutation({
    mutationFn: async () => {
      if (!(await flushAll())) throw new Error("Des champs n'ont pas pu être enregistrés");
      const res = await hubProductStudioApi.apply(reference, true);
      if (res?.error) throw new Error(String(res.error));
      return res;
    },
    onSuccess: async () => {
      toast.success("Prévisualisation terminée — rien n'a été écrit");
      try {
        await refetchAll();
      } catch {
        toast.error("La prévisualisation est terminée, mais l'écran n'a pas pu être rafraîchi");
      }
    },
    onError: async (error) => {
      toast.error(getApiErrorMessage(error, 'Prévisualisation en échec'));
      await refetchAll().catch(() => undefined);
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const log = latestRollbackLog(draft);
      if (!log) throw new Error('Aucune écriture à annuler');
      return hubProductStudioApi.rollback(reference, log.id);
    },
    onSuccess: async () => {
      toast.success('Dernière application annulée');
      invalidateWebsite();
      await refetchAll().catch(() => undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Annulation en échec')),
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!(await flushAll())) throw new Error("Des champs n'ont pas pu être enregistrés");
      return startDeploy();
    },
    onSuccess: (res) => {
      if (res.created) toast.success('Déploiement mis en file', { description: 'Vous serez notifié à la fin.' });
      onDeployQueued?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Impossible de lancer le déploiement')),
  });

  /**
   * Recalcul du GEO puis déploiement forcé : le brouillon et le score sont d'abord remis à jour,
   * puis la fiche est recontrôlée sur ces scores avant de mettre le job en file.
   * Renvoie `null` (sans erreur) si le contrôle des critères de mise en ligne bloque : le toast l'explique.
   */
  const refreshAndDeployMutation = useMutation({
    mutationFn: async () => {
      if (!(await flushAll())) throw new Error("Des champs n'ont pas pu être enregistrés");
      try {
        await refreshGeo();
      } catch (error) {
        // Le recalcul a déjà affiché son propre message d'erreur : on n'en ajoute pas un second.
        throw Object.assign(error instanceof Error ? error : new Error(String(error)), { toasted: true });
      }
      // Scores à jour (critères serveur) : le recalcul a pu faire monter ou baisser le score projeté.
      const freshDraft = await refetchAll();
      const freshScores = queryClient.getQueryData<StudioScores>(studioKeys.scores(reference));
      const freshProjected = freshScores?.projected?.score ?? freshDraft?.projectedScore?.score;
      const freshCurrent = freshScores?.current?.score ?? freshDraft?.currentScore?.score;
      const freshReadiness = freshScores?.readiness ?? null;
      const ready = freshReadiness
        ? freshReadiness.ok
        : canDeployToSite(freshCurrent) || canDeployToSite(freshProjected);
      if (freshDraft?.uniqueness?.blocking) {
        toast.error('GEO recalculé, déploiement non lancé', {
          description: 'Écriture bloquée : le texte est trop proche de celui du fabricant.',
          duration: 10000,
        });
        return null;
      }
      if (!ready) {
        toast.error('GEO recalculé, déploiement non lancé', {
          description:
            (freshReadiness && !freshReadiness.ok ? freshReadiness.blockers.join(' · ') : '') ||
            `Score ${freshCurrent ?? 0}/100 — un score supérieur à ${MIN_DEPLOY_SCORE} est requis`,
          duration: 10000,
        });
        return null;
      }
      return startDeploy({ forceGeo: true });
    },
    onSuccess: (res) => {
      if (res?.created) {
        toast.success('Recalcul terminé, déploiement mis en file', { description: 'Vous serez notifié à la fin.' });
        onDeployQueued?.();
      }
    },
    onError: (error) => {
      if ((error as { toasted?: boolean })?.toasted) return;
      toast.error(getApiErrorMessage(error, 'Impossible de recalculer et déployer'));
    },
  });

  /** Transforme une mutation en action de confirmation : `true` ferme la boîte de dialogue. */
  const toAction = useCallback(
    <T,>(run: () => Promise<T>) =>
      async () => {
        try {
          await run();
          return true;
        } catch {
          return false;
        }
      },
    [],
  );

  const simulate = useCallback(() => void simulateMutation.mutateAsync().catch(() => undefined), [simulateMutation]);

  const requestDeploy = useCallback(() => {
    if (!draft) return;
    if (blocking) {
      toast.error('Écriture bloquée : le texte est trop proche de celui du fabricant');
      return;
    }
    if (!readinessOk) {
      toast.error('Déploiement impossible', { description: deployBlockers.join(' · ') || undefined });
      return;
    }
    if (!canDeploy) return;
    setConfirm({
      title: 'Valider et déployer',
      message:
        "Le déploiement s'exécute en arrière-plan : le contenu validé est écrit sur la fiche PrestaShop (annulable), puis le produit est mis en ligne et déployé sur Google Merchant. Vous serez notifié à la fin.",
      details: [
        ...buildDeployRecap(),
        ...buildApplyDetails(draft, getPendingEdits(), getAttributeNames()),
        `Score actuel : ${deployScore ?? '—'}/100${projectedScore != null ? ` · projeté : ${projectedScore}/100` : ''}`,
      ],
      confirmLabel: 'Valider et déployer',
      tone: 'primary',
      action: toAction(() => deployMutation.mutateAsync()),
    });
  }, [blocking, canDeploy, deployBlockers, readinessOk, deployMutation, deployScore, draft, getAttributeNames, getPendingEdits, projectedScore, toAction]);

  const requestRefreshAndDeploy = useCallback(() => {
    if (!draft) return;
    if (blocking) {
      toast.error('Écriture bloquée : le texte est trop proche de celui du fabricant');
      return;
    }
    if (jobBusy) return;
    setConfirm({
      title: 'Recalculer et déployer',
      message:
        "Le GEO est recalculé maintenant (IA), puis le déploiement part en arrière-plan. Un GEO déjà publié, même plus complet, sera remplacé. Les critères de mise en ligne sont recontrôlés après le recalcul. Vous serez notifié à la fin.",
      details: [
        ...buildDeployRecap({ recalculateGeo: true }),
        ...buildApplyDetails(draft, getPendingEdits(), getAttributeNames()),
      ],
      confirmLabel: 'Recalculer et déployer',
      tone: 'primary',
      action: toAction(() => refreshAndDeployMutation.mutateAsync()),
    });
  }, [blocking, draft, getAttributeNames, getPendingEdits, jobBusy, refreshAndDeployMutation, toAction]);

  const requestRollback = useCallback(() => {
    if (!latestRollbackLog(draft)) return;
    setConfirm({
      title: 'Annuler la dernière application',
      message: 'Le contenu enregistré avant la dernière écriture sera rétabli sur PrestaShop.',
      details: [],
      confirmLabel: 'Rétablir',
      tone: 'danger',
      action: toAction(() => rollbackMutation.mutateAsync()),
    });
  }, [draft, rollbackMutation, toAction]);

  /**
   * Ferme le drawer, après confirmation s'il reste du travail non enregistré.
   * Un job en file ou en cours n'est pas un obstacle : il continue sur le serveur.
   */
  const requestClose = useCallback(
    (close: () => void, confirmLabel = 'Enregistrer et continuer') => {
      if (hasUnsavedWork()) {
        setConfirm({
          title: 'Modifications non enregistrées',
          message: 'Des champs modifiés ne sont pas encore enregistrés.',
          details: [],
          confirmLabel,
          tone: 'primary',
          action: async () => {
            if (!(await flushAll())) return false;
            close();
            return true;
          },
        });
        return;
      }
      close();
    },
    [flushAll, hasUnsavedWork],
  );

  const cancelConfirm = useCallback(() => {
    if (!confirming) setConfirm(null);
  }, [confirming]);

  const runConfirm = useCallback(async () => {
    if (!confirm) return;
    setConfirming(true);
    try {
      if (await confirm.action()) setConfirm(null);
    } finally {
      setConfirming(false);
    }
  }, [confirm]);

  return {
    confirm,
    confirming,
    cancelConfirm,
    runConfirm,
    deployScore,
    deployGrade,
    gate,
    canDeploy,
    blocking,
    canRollback: Boolean(latestRollbackLog(draft)),
    simulating: simulateMutation.isPending,
    refreshingAndDeploying: refreshAndDeployMutation.isPending,
    rollingBack: rollbackMutation.isPending,
    deployBlockers,
    readiness,
    deployScoreHint: readinessOk
      ? undefined
      : deployBlockers.length > 0
        ? `Déploiement bloqué : ${deployBlockers.join(' · ')}`
        : `Score ${deployScore ?? 0}/100 — un score supérieur à ${MIN_DEPLOY_SCORE} est requis`,
    simulate,
    requestDeploy,
    requestRefreshAndDeploy,
    requestRollback,
    requestClose,
  };
}
