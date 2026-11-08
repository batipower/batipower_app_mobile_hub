import { useSyncExternalStore } from 'react';

/**
 * Brouillon partagé entre la feuille « Analyser » et ses feuilles de choix (affaire) : les deux
 * sont des routes distinctes, la valeur choisie doit donc survivre à la fermeture du sélecteur.
 */
type LauncherDraft = {
  /** Affaire à laquelle rattacher le produit analysé. */
  affaireId: string;
  /** Affaire de la réserve à traiter. */
  reserveAffaireId: string;
  /** EAN lu par le scanner, en attente d'être repris par la feuille. */
  scannedEan: string | null;
};

const INITIAL: LauncherDraft = { affaireId: '', reserveAffaireId: '', scannedEan: null };

let draft: LauncherDraft = INITIAL;
const listeners = new Set<() => void>();

function emit(next: LauncherDraft) {
  draft = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLauncherDraft(): LauncherDraft {
  return useSyncExternalStore(subscribe, () => draft, () => draft);
}

export function patchLauncherDraft(partial: Partial<LauncherDraft>) {
  emit({ ...draft, ...partial });
}

export function resetLauncherDraft() {
  emit(INITIAL);
}
