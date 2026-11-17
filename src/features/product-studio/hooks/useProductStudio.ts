
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiErrorMessage } from '../lib/errors';
import { brandDecisionOf, brandProposalOf, isBrandLinked, isGenerableView, STEPS, TABS } from '../domain/model';
import { buildLaunchGuide, todoByTab, type LaunchStep } from '../domain/blockers';
import { studioJobStepMap } from '../domain/jobs';
import type { StudioStepId } from '@/types/hubStudio';
import { useStudioAttributeSelection } from './useStudioAttributeSelection';
import { useStudioBlockActions } from './useStudioBlockActions';
import { useStudioFieldEditor } from './useStudioFieldEditor';
import { useStudioJob } from './useStudioJob';
import { useStudioPublishFlow } from './useStudioPublishFlow';
import { useStudioSteps } from './useStudioSteps';
import { useStudioDraft, useStudioScores } from './useStudioQueries';
import { toast } from 'sonner-native';

/**
 * Contrôleur du Product Studio d'un produit : compose les hooks spécialisés
 * (requêtes, édition des champs, sélection d'attributs, actions de blocs,
 * préparation temps réel, cycle d'écriture) derrière une API unique, exposée
 * aux onglets par `StudioProvider`.
 */
export function useProductStudio(
  reference: string,
  enabled: boolean,
  options: { onDeployQueued?: () => void } = {},
) {
  const draftQuery = useStudioDraft(reference, enabled);
  const scoresQuery = useStudioScores(reference, enabled);
  const draft = draftQuery.data ?? null;
  const [tab, setTab] = useState<StudioStepId>(TABS[0]?.id ?? 'contenu');
  const [imageLabel, setImageLabel] = useState('Génération…');
  // Demande de mise en évidence : l'onglet cible la lit une fois chargé (le `nonce` relance l'effet à chaque clic).
  const [focusRequest, setFocusRequest] = useState<{ target: string | null; nonce: number } | null>(null);

  const editor = useStudioFieldEditor(reference, draft);
  const attributes = useStudioAttributeSelection(reference, draft);
  const blocks = useStudioBlockActions(reference, setImageLabel);

  const resetLocalWork = useCallback(() => {
    editor.reset();
    attributes.reset();
  }, [editor, attributes]);

  const job = useStudioJob({ reference, enabled, onPrepared: resetLocalWork });

  const flushAll = useCallback(async () => {
    const attributesSaved = await attributes.flush();
    return attributesSaved && (await editor.flushAll());
  }, [attributes, editor]);

  const hasUnsavedWork = useCallback(
    () => editor.hasUnsavedWork() || attributes.hasPendingSave(),
    [attributes, editor],
  );

  const publish = useStudioPublishFlow({
    reference,
    draft,
    scores: scoresQuery.data,
    jobBusy: job.active,
    startDeploy: job.startDeploy,
    refreshGeo: () => blocks.refreshGeo.mutateAsync(),
    flushAll,
    getPendingEdits: editor.getPendingEdits,
    getAttributeNames: attributes.selectedNames,
    hasUnsavedWork,
    onDeployQueued: options.onDeployQueued,
  });

  // Assistant de mise en ligne : étapes dérivées du contrôle du serveur, recalculées à chaque correction.
  const launchGuide = useMemo(() => buildLaunchGuide(scoresQuery.data, draft), [scoresQuery.data, draft]);
  const launchByTab = useMemo(() => todoByTab(launchGuide), [launchGuide]);

  /** Ouvre l'onglet de l'étape et demande d'entourer l'élément à utiliser. */
  const goToStep = useCallback((step: LaunchStep | null) => {
    if (!step?.tab) return;
    setTab(step.tab);
    setFocusRequest({ target: step.target, nonce: Date.now() });
  }, []);

  // Un produit doit avoir une marque : tant qu'aucune n'est confirmée, l'étape Contenu ne se valide pas.
  const brandMissing = Boolean(draft?.preparedAt) && !isBrandLinked(draft);

  const reviewSteps = useStudioSteps({
    reference,
    draft,
    step: tab,
    setStep: setTab,
    flushAll,
    pendingFieldCount: editor.pendingFieldCount,
    brandMissing,
    acceptAll: editor.acceptAll,
  });

  // À l'ouverture, on reprend le parcours à la première étape pas encore validée (une seule fois par brouillon chargé).
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !draft?.preparedAt) return;
    resumedRef.current = true;
    const first = TABS.find((item) => !draft.stepValidations?.[item.id]);
    setTab(first ? first.id : 'deployer');
  }, [draft]);

  /** Déploiement : toutes les étapes de relecture doivent être validées, sinon on renvoie à la première manquante. */
  const requestDeploy = useCallback(() => {
    if (!reviewSteps.allStepsValidated) {
      const first = TABS.find((item) => !draft?.stepValidations?.[item.id]);
      toast.error(`Il reste ${reviewSteps.remainingSteps.length} étape${reviewSteps.remainingSteps.length > 1 ? 's' : ''} à valider`, {
        description: reviewSteps.remainingSteps.join(' · '),
      });
      if (first) setTab(first.id);
      return;
    }
    publish.requestDeploy();
  }, [draft?.stepValidations, publish, reviewSteps.allStepsValidated, reviewSteps.remainingSteps]);

  // Un brouillon déjà préparé affiche toutes les étapes terminées.
  const steps: Record<string, string> =
    job.job?.type === 'PREPARE' && job.job.steps?.length
      ? studioJobStepMap(job.job)
      : draft?.preparedAt
        ? Object.fromEntries(STEPS.map((step) => [step.key, 'done']))
        : {};

  const generateImages = useCallback(() => {
    const views = (draft?.imagePlan ?? []).filter(isGenerableView).map((item) => item.viewType);
    if (!views.length) {
      toast.error('Aucune vue générable : une photo réelle est requise pour les vues manquantes');
      return;
    }
    blocks.generateImages.mutate(views);
  }, [blocks.generateImages, draft?.imagePlan]);

  const loadError = draftQuery.isError ? getApiErrorMessage(draftQuery.error, 'Impossible de charger le brouillon') : null;

  return {
    reference,
    draft,
    loading: draftQuery.isLoading,
    loadError,
    reload: () => void draftQuery.refetch(),
    tab,
    setTab,

    // Assistant de mise en ligne
    launchGuide,
    launchByTab,
    goToStep,
    focusRequest,

    // Job de la file (préparation IA ou déploiement), suivi par polling
    job: job.job,
    jobBusy: job.active,
    jobStarting: job.starting,
    preparing: job.preparing,
    deploying: job.deploying,
    queuePosition: job.queuePosition,
    prepareAvailable: true,
    prepareError: job.prepareError,
    steps,
    stepList: STEPS,
    jobId: job.job?.id ?? null,
    startPrepare: job.startPrepare,

    // Champs de contenu
    fieldViews: editor.fieldViews,
    validated: editor.validated,
    pendingFieldCount: editor.pendingFieldCount,
    bulk: editor.bulk,
    isFieldBusy: editor.isFieldBusy,
    setFieldValue: editor.setFieldValue,
    flushField: editor.flushField,
    validateField: editor.validateField,
    rejectField: editor.rejectField,
    restoreProposal: editor.restoreProposal,
    regenerateField: editor.regenerateField,
    acceptAll: editor.acceptAll,
    setFieldHint: editor.setFieldHint,

    // Attributs
    attributes: attributes.attributes,
    attributesSaving: attributes.saving,
    toggleAttribute: attributes.toggleAttribute,
    setAttributesSelected: attributes.setAttributesSelected,

    // Blocs
    brandProposal: brandProposalOf(draft),
    brandDecision: brandDecisionOf(draft),
    brandMissing,
    blocks,
    imageLabel,
    generateImages,

    // Écriture et mise en ligne
    ...publish,
    requestDeploy,
    ...reviewSteps,
    previewUrl: draft?.previewUrl ?? null,
  };
}

export type ProductStudioController = ReturnType<typeof useProductStudio>;
