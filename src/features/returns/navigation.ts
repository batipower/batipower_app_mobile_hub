import { router } from 'expo-router';

/** Navigation interne à la page Retours (menu) : tout s'empile dans sa pile. */

export function openReturn(reference: string) {
  router.push({ pathname: '/hub/retours/[reference]', params: { reference } });
}

export function openReturnFilters() {
  router.push('/hub/retours/filtres');
}

/** Feuille de réception ; `reference` = référence de la commande résolue par la fiche. */
export function openReturnReceive(reference: string) {
  router.push({ pathname: '/hub/retours/recevoir', params: { reference } });
}

/** Feuille d'édition de la remarque manager. */
export function openReturnNote(reference: string) {
  router.push({ pathname: '/hub/retours/note', params: { reference } });
}
