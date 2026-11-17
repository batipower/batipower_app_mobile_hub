
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner-native';
import { getApiErrorMessage } from '../lib/errors';
import { hubProductStudioApi } from '@/api/hubProductStudio';
import { STUDIO_STEPS, TABS } from '../domain/model';
import type { StudioDraft, StudioStepId, StudioTab } from '@/types/hubStudio';
import { useStudioCache } from './useStudioQueries';

export const BRAND_REQUIRED_MESSAGE = 'Marque obligatoire : validez la marque proposée ou rattachez-en une avant de valider le contenu';

interface UseStudioStepsOptions {
  reference: string;
  draft: StudioDraft | null;
  step: StudioStepId;
  setStep: (step: StudioStepId) => void;
  /** Enregistre les saisies en attente avant de valider (le serveur valide l'état enregistré). */
  flushAll: () => Promise<boolean>;
  /** Champs de contenu restant à décider : ils bloquent la validation de l'étape Contenu. */
  pendingFieldCount: number;
  /** Aucune marque confirmée : bloque aussi la validation de l'étape Contenu (un produit doit avoir une marque). */
  brandMissing: boolean;
  /** Valide tous les champs en attente (`true` si tous sont enregistrés). */
  acceptAll: () => Promise<boolean>;
}

/**
 * Parcours de relecture du Studio : 6 étapes à valider (Contenu, Attributs, Images, GEO, Associés,
 * Catégories) puis « Déployer ». Les validations sont enregistrées côté serveur, par étape ;
 * toute modification d'une étape retire sa validation (le serveur la renvoie dans le brouillon).
 */
export function useStudioSteps({ reference, draft, step, setStep, flushAll, pendingFieldCount, brandMissing, acceptAll }: UseStudioStepsOptions) {
  const { setDraft } = useStudioCache(reference);
  const [validating, setValidating] = useState(false);

  const validations = draft?.stepValidations ?? null;
  const isStepValidated = useCallback((id: StudioStepId) => id !== 'deployer' && Boolean(validations?.[id]), [validations]);
  const validatedCount = TABS.filter((tab) => validations?.[tab.id]).length;
  const totalSteps = TABS.length;
  const remainingSteps = TABS.filter((tab) => !validations?.[tab.id]);
  const allStepsValidated = remainingSteps.length === 0;

  const index = STUDIO_STEPS.findIndex((item) => item.id === step);
  const previousStep = index > 0 ? STUDIO_STEPS[index - 1]!.id : null;
  const nextStep = index >= 0 && index < STUDIO_STEPS.length - 1 ? STUDIO_STEPS[index + 1]!.id : null;

  const send = useCallback(
    async (id: StudioTab, validated: boolean): Promise<boolean> => {
      setValidating(true);
      try {
        if (validated && !(await flushAll())) {
          toast.error("Des champs n'ont pas pu être enregistrés");
          return false;
        }
        setDraft(await hubProductStudioApi.validateStep(reference, id, validated));
        return true;
      } catch (error) {
        toast.error(getApiErrorMessage(error, validated ? "Impossible de valider l'étape" : "Impossible de rouvrir l'étape"));
        return false;
      } finally {
        setValidating(false);
      }
    },
    [flushAll, reference, setDraft],
  );

  /** Valide l'étape courante puis passe à la suivante. */
  const validateCurrentStep = useCallback(async () => {
    if (step === 'deployer' || validating) return;
    if (step === 'contenu' && brandMissing) {
      toast.error(BRAND_REQUIRED_MESSAGE);
      return;
    }
    if (step === 'contenu' && pendingFieldCount > 0) {
      toast.error('Validez ou refusez chaque champ avant de valider cette étape');
      return;
    }
    if (await send(step, true) && nextStep) setStep(nextStep);
  }, [brandMissing, nextStep, pendingFieldCount, send, setStep, step, validating]);

  /** Contenu : accepte les champs en attente puis valide l'étape. */
  const acceptAllAndValidate = useCallback(async () => {
    if (step !== 'contenu' || validating) return;
    // La marque n'est jamais acceptée à la place de l'utilisateur : elle doit être confirmée explicitement.
    if (brandMissing) {
      toast.error(BRAND_REQUIRED_MESSAGE);
      return;
    }
    if (!(await acceptAll())) return;
    if (await send('contenu', true) && nextStep) setStep(nextStep);
  }, [acceptAll, brandMissing, nextStep, send, setStep, step, validating]);

  const reopenStep = useCallback(
    async (id: StudioTab) => {
      if (validating) return;
      await send(id, false);
    },
    [send, validating],
  );

  return useMemo(
    () => ({
      stepValidations: validations,
      isStepValidated,
      validatedCount,
      totalSteps,
      remainingSteps: remainingSteps.map((tab) => tab.label),
      allStepsValidated,
      stepValidating: validating,
      previousStep,
      nextStep,
      goPreviousStep: () => previousStep && setStep(previousStep),
      goNextStep: () => nextStep && setStep(nextStep),
      validateCurrentStep,
      acceptAllAndValidate,
      reopenStep,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, validations, isStepValidated, validatedCount, validating, previousStep, nextStep, validateCurrentStep, acceptAllAndValidate, reopenStep, setStep],
  );
}
