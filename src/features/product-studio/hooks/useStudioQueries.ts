
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hubProductStudioApi } from '@/api/hubProductStudio';
import type { StudioDraft } from '@/types/hubStudio';

/** Clés du Studio : le cache du brouillon est l'unique source de vérité de l'écran. */
export const studioKeys = {
  all: (reference: string) => ['hub-product', reference, 'studio'] as const,
  draft: (reference: string) => ['hub-product', reference, 'studio', 'draft'] as const,
  scores: (reference: string) => ['hub-product', reference, 'studio', 'scores'] as const,
  manufacturers: (reference: string) => ['hub-product', reference, 'studio', 'manufacturers'] as const,
  categories: (reference: string) => ['hub-product', reference, 'studio', 'categories'] as const,
  publicLink: (reference: string) => ['hub-product', reference, 'studio', 'public-link'] as const,
  siteContent: (reference: string) => ['hub-product', reference, 'studio', 'site-content'] as const,
};

export function useStudioDraft(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: studioKeys.draft(reference),
    queryFn: () => hubProductStudioApi.getDraft(reference),
    enabled: enabled && reference.length > 0,
    // Les éditions en cours vivent hors du cache : un refetch ne peut pas les écraser,
    // mais on évite tout rechargement inutile pendant la revue.
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

/** Score actuel, score projeté et barrière de mise en ligne. */
export function useStudioScores(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: studioKeys.scores(reference),
    queryFn: () => hubProductStudioApi.getScores(reference),
    enabled: enabled && reference.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

export function useStudioManufacturers(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: studioKeys.manufacturers(reference),
    queryFn: async () => {
      const rows = await hubProductStudioApi.listManufacturers(reference);
      return (Array.isArray(rows) ? rows : []).filter(
        (item) => Number.isFinite(Number(item.id)) && Number(item.id) > 0 && item.name,
      );
    },
    enabled: enabled && reference.length > 0,
    staleTime: 10 * 60_000,
  });
}

/** Arbre complet des catégories PrestaShop (onglet Catégories). */
export function useStudioCategoryTree(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: studioKeys.categories(reference),
    queryFn: async () => {
      const rows = await hubProductStudioApi.listCategories(reference);
      return (Array.isArray(rows) ? rows : []).filter((node) => Number.isFinite(Number(node.id)) && Number(node.id) > 0);
    },
    enabled: enabled && reference.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60_000,
  });
}

/** Délai avant de recontrôler la mise en ligne : regroupe les enregistrements rapprochés (saisie, cases à cocher). */
const READINESS_RECHECK_MS = 800;
const readinessTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Écritures directes dans le cache du Studio (brouillon et scores). */
export function useStudioCache(reference: string) {
  const queryClient = useQueryClient();

  /**
   * Adopte le brouillon à jour, puis recontrôle les critères de mise en ligne : l'assistant passe une étape
   * au vert dès que l'image, le GEO, l'attribut ou le texte manquant vient d'être corrigé.
   */
  const setDraft = useCallback(
    (draft: StudioDraft) => {
      queryClient.setQueryData(studioKeys.draft(reference), draft);
      clearTimeout(readinessTimers.get(reference));
      readinessTimers.set(
        reference,
        setTimeout(() => {
          readinessTimers.delete(reference);
          void queryClient.invalidateQueries({ queryKey: studioKeys.scores(reference) });
        }, READINESS_RECHECK_MS),
      );
    },
    [queryClient, reference],
  );

  const getDraft = useCallback(
    () => queryClient.getQueryData<StudioDraft>(studioKeys.draft(reference)) ?? null,
    [queryClient, reference],
  );

  /** Relit le brouillon et les scores depuis le serveur (après écriture, préparation, annulation). */
  const refetchAll = useCallback(async () => {
    const [draft] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: studioKeys.draft(reference),
        queryFn: () => hubProductStudioApi.getDraft(reference),
        staleTime: 0,
      }),
      queryClient.fetchQuery({
        queryKey: studioKeys.scores(reference),
        queryFn: () => hubProductStudioApi.getScores(reference),
        staleTime: 0,
      }),
    ]);
    return draft;
  }, [queryClient, reference]);

  return { setDraft, getDraft, refetchAll };
}
