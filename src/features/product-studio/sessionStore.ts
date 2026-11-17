import { useSyncExternalStore } from 'react';

/**
 * Relecture en série : la liste des références « À traiter » est figée à l'ouverture du Studio
 * (comme sur le web), `index` désigne la fiche affichée. Une session d'une seule fiche n'affiche
 * pas la barre de navigation.
 */
export type ReviewSession = { references: readonly string[]; index: number };

let state: ReviewSession | null = null;
const listeners = new Set<() => void>();

function emit(next: ReviewSession | null) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

export function useReviewSession(): ReviewSession | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getReviewSession(): ReviewSession | null {
  return state;
}

export function startReviewSession(references: readonly string[], startReference?: string) {
  if (references.length === 0) return;
  const index = startReference ? Math.max(references.indexOf(startReference), 0) : 0;
  emit({ references, index });
}

export function setReviewIndex(index: number) {
  if (state) emit({ ...state, index });
}

/** Retire une fiche de la session (écartée) ; renvoie la session restante ou `null`. */
export function removeFromReviewSession(reference: string): ReviewSession | null {
  if (!state) return null;
  const references = state.references.filter((ref) => ref !== reference);
  const next =
    references.length > 0
      ? { references, index: Math.min(state.index, references.length - 1) }
      : null;
  emit(next);
  return next;
}

export function endReviewSession() {
  if (state) emit(null);
}
