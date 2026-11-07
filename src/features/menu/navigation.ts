import { router, type Href } from 'expo-router';

/** Ouvre la feuille de menu du HUB (mi-écran, par-dessus les onglets). */
export function openHubMenu() {
  router.push('/hub/menu');
}

/**
 * Lance une action depuis la feuille de menu : la feuille est fermée d'abord, puis la page
 * poussée (ou l'action exécutée), pour qu'elle ne s'empile pas au-dessus de la feuille.
 */
export function openFromMenu(target: Href | (() => void)) {
  router.back();
  // Laisse l'animation de fermeture de la feuille démarrer avant de naviguer.
  setTimeout(() => {
    if (typeof target === 'function') target();
    else router.push(target);
  }, 50);
}
