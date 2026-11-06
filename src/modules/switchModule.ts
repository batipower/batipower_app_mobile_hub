import { router } from 'expo-router';

import type { BatipowerModule, CurrentUser } from '@/types/user';

import { getModuleHref } from './registry';

/** Hauteur d'une ligne du sélecteur (ligne + espacement). */
export const MODULE_ROW_HEIGHT = 68;

/** En-tête de la feuille (poignée, titre) et zone de sécurité du bas, en points. */
const SHEET_CHROME_HEIGHT = 130;

/**
 * Cran de la feuille du sélecteur, en fraction de la hauteur d'écran : juste assez
 * pour afficher tous les modules (la liste défile si la police dynamique la déborde).
 */
export function moduleSheetDetent(moduleCount: number, windowHeight: number): number {
  const wanted =
    (SHEET_CHROME_HEIGHT + moduleCount * MODULE_ROW_HEIGHT) / Math.max(windowHeight, 1);
  return Math.min(0.85, Math.max(0.3, wanted));
}

/** Ouvre le sélecteur de module (feuille native). `active` y reçoit la coche. */
export function openModuleSwitcher(active: BatipowerModule | null) {
  router.push({ pathname: '/switch-module', params: active ? { active } : {} });
}

/**
 * Bascule vers un module depuis le sélecteur : ferme la feuille puis remplace l'écran
 * courant par l'accueil du module, pour que l'historique ne s'empile pas d'un module
 * à l'autre (pas de retour « fantôme » vers le module précédent).
 */
export function switchToModule(
  id: BatipowerModule,
  user: Pick<CurrentUser, 'role'>,
  active: BatipowerModule | null,
) {
  router.dismissAll();
  if (id === active) return;
  router.replace(getModuleHref(id, user));
}
