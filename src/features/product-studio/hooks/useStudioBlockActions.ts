
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import { getApiErrorMessage } from '../lib/errors';
import { hubProductStudioApi } from '@/api/hubProductStudio';
import type {
  StudioBrandAction,
  StudioCategoryDecision,
  StudioDraft,
  StudioImageImportResponse,
} from '@/types/hubStudio';
import { useStudioCache } from './useStudioQueries';

interface StudioActionOptions<TVariables, TResult> {
  reference: string;
  mutationFn: (variables: TVariables) => Promise<TResult>;
  /** Extrait le brouillon à jour de la réponse (identité par défaut : la réponse EST le brouillon). */
  toDraft?: (result: TResult) => StudioDraft;
  successMessage?: string | ((result: TResult, variables: TVariables) => string | null);
  errorFallback: string;
  onSuccess?: (result: TResult, variables: TVariables) => void;
}

/**
 * Fabrique des actions du Studio qui renvoient le brouillon à jour : adopte le
 * résultat dans le cache, notifie par toast, et expose `isPending` natif.
 * Remplace les blocs `pend` / `try` / `fail` / `unpend` répétés par action.
 */
export function useStudioAction<TVariables, TResult = StudioDraft>({
  reference,
  mutationFn,
  toDraft,
  successMessage,
  errorFallback,
  onSuccess,
}: StudioActionOptions<TVariables, TResult>) {
  const { setDraft } = useStudioCache(reference);

  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      setDraft(toDraft ? toDraft(result) : (result as unknown as StudioDraft));
      const message = typeof successMessage === 'function' ? successMessage(result, variables) : successMessage;
      if (message) toast.success(message);
      onSuccess?.(result, variables);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, errorFallback)),
  });
}

/** Une vue d'image à la fois : un appel par vue évite de dépasser le délai du proxy. */
async function generateViews(
  reference: string,
  views: string[],
  onProgress: (done: number, total: number, view: string) => void,
): Promise<StudioDraft> {
  let last: StudioDraft | null = null;
  for (let index = 0; index < views.length; index += 1) {
    const view = views[index] ?? '';
    onProgress(index + 1, views.length, view);
    last = await hubProductStudioApi.generateImage(reference, view);
  }
  if (!last) throw new Error('Aucune vue à générer');
  return last;
}

/** Actions de blocs du Studio : marque, GEO, associés, catégories, images. */
export function useStudioBlockActions(reference: string, onImageProgress: (label: string) => void) {
  const brand = useStudioAction({
    reference,
    mutationFn: (vars: { action: StudioBrandAction; manufacturerId?: number; createName?: string }) =>
      hubProductStudioApi.decideBrand(reference, vars),
    successMessage: (_, vars) => (vars.action === 'REJECT' ? 'Marque refusée' : 'Marque enregistrée'),
    errorFallback: 'Décision marque en échec',
  });

  const brandLogo = useStudioAction({
    reference,
    mutationFn: (dataUrl: string) => hubProductStudioApi.uploadBrandLogo(reference, dataUrl),
    errorFallback: 'Envoi du logo en échec',
  });

  const refreshRelated = useStudioAction<void>({
    reference,
    mutationFn: () => hubProductStudioApi.refreshRelated(reference),
    errorFallback: 'Recalcul des associés en échec',
  });

  const saveRelated = useStudioAction({
    reference,
    mutationFn: (selectedReferences: string[]) => hubProductStudioApi.decideRelated(reference, selectedReferences),
    successMessage: 'Associés enregistrés',
    errorFallback: 'Sélection des associés en échec',
  });

  const refreshCategory = useStudioAction<void>({
    reference,
    mutationFn: () => hubProductStudioApi.refreshCategory(reference),
    errorFallback: 'Recalcul des catégories en échec',
  });

  const saveCategory = useStudioAction({
    reference,
    mutationFn: (vars: StudioCategoryDecision) => hubProductStudioApi.decideCategory(reference, vars),
    successMessage: 'Catégories enregistrées',
    errorFallback: 'Sélection des catégories en échec',
  });

  const refreshGeo = useStudioAction<void>({
    reference,
    mutationFn: () => hubProductStudioApi.refreshGeo(reference),
    successMessage: 'GEO recalculé',
    errorFallback: 'Recalcul du GEO en échec',
  });

  const removeGeoFaq = useStudioAction({
    reference,
    mutationFn: (index: number) => hubProductStudioApi.removeGeoFaq(reference, index),
    successMessage: 'Question GEO supprimée',
    errorFallback: 'Suppression de la question en échec',
  });

  const reorderImages = useStudioAction({
    reference,
    mutationFn: (ids: string[]) => hubProductStudioApi.reorderImages(reference, ids),
    errorFallback: 'Réordonnancement en échec',
  });

  const coverImage = useStudioAction({
    reference,
    mutationFn: (id: string) => hubProductStudioApi.setCoverImage(reference, id),
    errorFallback: 'Changement de couverture en échec',
  });

  const removeImage = useStudioAction({
    reference,
    mutationFn: (id: string) => hubProductStudioApi.deleteImage(reference, id),
    errorFallback: "Suppression de l'image en échec",
  });

  const generateImages = useStudioAction({
    reference,
    mutationFn: (views: string[]) =>
      generateViews(reference, views, (done, total, view) => onImageProgress(`Génération ${done}/${total} · ${view}`)),
    successMessage: 'Images générées',
    errorFallback: "Génération d'image en échec",
  });

  const importImages = useStudioAction<string[], StudioImageImportResponse>({
    reference,
    mutationFn: (urls) => hubProductStudioApi.importImages(reference, urls),
    toDraft: (result) => result.draft,
    successMessage: (result) => {
      const imported = result.results.filter((item) => item.status === 'imported').length;
      return imported ? `${imported} image${imported > 1 ? 's' : ''} importée${imported > 1 ? 's' : ''}` : null;
    },
    onSuccess: (result) => {
      const rejected = result.results.filter((item) => item.status === 'rejected');
      if (rejected.length && rejected.length === result.results.length) {
        toast.error(rejected.map((item) => item.reason || item.url).join(' · ') || "Import d'image en échec");
      }
    },
    errorFallback: "Import d'image en échec",
  });

  return {
    brand,
    brandLogo,
    refreshRelated,
    saveRelated,
    refreshCategory,
    saveCategory,
    refreshGeo,
    removeGeoFaq,
    reorderImages,
    coverImage,
    removeImage,
    generateImages,
    importImages,
  };
}

export type StudioBlockActions = ReturnType<typeof useStudioBlockActions>;
