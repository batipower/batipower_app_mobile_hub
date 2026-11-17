import { router } from 'expo-router';

import { endReviewSession, startReviewSession } from './sessionStore';

/** Navigation de la pile « Fiches produit » (menu Hub). */

/** Ouvre le Studio sur une liste de fiches (relecture en série) à partir de `startReference`. */
export function openStudioReview(references: readonly string[], startReference?: string) {
  if (references.length === 0) return;
  startReviewSession(references, startReference);
  const first = startReference ?? references[0];
  if (!first) return;
  router.push({ pathname: '/hub/fiches-produit/studio/[reference]', params: { reference: first } });
}

/** Ouvre le Studio sur une seule fiche (reprise après un échec). */
export function openStudio(reference: string) {
  openStudioReview([reference], reference);
}

/** Passe à une autre fiche de la session sans empiler d'écran. */
export function showStudioReference(reference: string) {
  router.setParams({ reference });
}

/** Ferme le Studio et termine la session. */
export function closeStudio() {
  endReviewSession();
  if (router.canGoBack()) router.back();
  else router.replace('/hub/fiches-produit');
}

export function openQueueFilters() {
  router.push('/hub/fiches-produit/filtres');
}

export function openQueue() {
  router.push('/hub/fiches-produit');
}
