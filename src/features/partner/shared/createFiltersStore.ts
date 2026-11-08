import { useSyncExternalStore } from 'react';

/**
 * Store de filtres d'une liste PARTNER. La liste et sa feuille de filtres sont des routes
 * distinctes qui doivent partager le même état : un petit store de module (comme celui des
 * retours) plutôt qu'un contexte. Remis à zéro à la déconnexion (`resetPartnerState`).
 */
export function createFiltersStore<T extends object>(defaults: T) {
  let state = defaults;
  const listeners = new Set<() => void>();

  const emit = (next: T) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => state;

  return {
    defaults,
    useFilters: (): T => useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
    patch: (partial: Partial<T>) => emit({ ...state, ...partial }),
    reset: () => emit(defaults),
  };
}
