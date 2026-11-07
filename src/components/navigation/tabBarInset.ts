import { useSyncExternalStore } from 'react';

/**
 * Hauteur occupée en bas de l'écran par la barre d'onglets flottante (0 quand elle est masquée).
 *
 * La barre est posée par-dessus les écrans : ceux-ci réservent cet espace en bas de leur contenu
 * défilant (`useTabBarInset`). Un petit magasin externe plutôt qu'un contexte, car la barre vit
 * dans le layout des onglets alors que d'autres consommateurs (la pastille d'impersonation) sont
 * montés plus haut dans l'arbre.
 */
let current = 0;
const listeners = new Set<() => void>();

export function setTabBarInset(value: number) {
  const next = Math.round(value);
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Espace à réserver sous le contenu pour ne pas passer sous la barre d'onglets. */
export function useTabBarInset(): number {
  return useSyncExternalStore(subscribe, () => current);
}
