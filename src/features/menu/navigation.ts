import { router, type Href } from 'expo-router';

import { dismissSheetThen } from '@/components/sheet/dismissSheet';

/** Ouvre la feuille de menu du HUB (mi-écran, par-dessus les onglets). */
export function openHubMenu() {
  router.push('/hub/menu');
}

/**
 * Lance une action depuis la feuille de menu : la feuille est fermée d'abord, puis la page
 * poussée (ou l'action exécutée) une fois l'animation de fermeture terminée, pour qu'elle ne
 * s'empile pas au-dessus de la feuille.
 */
export function openFromMenu(target: Href | (() => void)) {
  dismissSheetThen(() => {
    if (typeof target === 'function') target();
    else router.push(target);
  });
}
