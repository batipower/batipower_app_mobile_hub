import { router } from 'expo-router';

/**
 * Durée de l'animation de fermeture d'une feuille native, avec une marge. Une page, une alerte
 * ou une autre feuille ouverte avant ce délai s'empile sur la feuille en cours de fermeture
 * (présentation ignorée ou doublée sur iOS).
 */
export const SHEET_DISMISS_DELAY_MS = 400;

/**
 * Ferme la feuille courante puis exécute l'action une fois la fermeture terminée : une alerte,
 * un écran poussé ou un autre sélecteur ne peuvent pas s'ouvrir pendant l'animation.
 * Point d'entrée unique de tous les enchaînements « feuille puis suite ».
 */
export function dismissSheetThen(action: () => void, delay = SHEET_DISMISS_DELAY_MS) {
  router.back();
  setTimeout(action, delay);
}
