import { useSyncExternalStore } from 'react';

import type { HubPricingFilters } from '@/types/hubPricing';

import { DEFAULT_FILTERS } from './filters';
import type { PricingCountry } from './options';

/**
 * État de la page Pricing (filtres + pays affiché), tenu dans un store de module : la liste et
 * les feuilles (filtres, tri, stats, choix) sont des routes distinctes qui doivent le partager.
 * Il vit pour la durée de la session ; `resetPricingState` le remet à zéro à la déconnexion.
 */
type PricingState = {
  filters: HubPricingFilters;
  country: PricingCountry;
};

const INITIAL: PricingState = { filters: DEFAULT_FILTERS, country: 'FR' };

let state: PricingState = INITIAL;
const listeners = new Set<() => void>();

function emit(next: PricingState) {
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

export function usePricingState(): PricingState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getPricingState(): PricingState {
  return state;
}

/** Applique un patch aux filtres ; la pagination repart de la page 1 (sauf `page` explicite). */
export function patchPricingFilters(partial: Partial<HubPricingFilters>) {
  emit({
    ...state,
    filters: { ...state.filters, page: 1, ...partial },
  });
}

/**
 * Remet les filtres à zéro. Le tri et la recherche sont conservés : la recherche vit dans la
 * barre native de l'écran, qui ne se vide pas depuis l'extérieur.
 */
export function resetPricingFilters() {
  emit({
    ...state,
    filters: {
      ...DEFAULT_FILTERS,
      search: state.filters.search,
      sortBy: state.filters.sortBy,
      sortOrder: state.filters.sortOrder,
    },
  });
}

export function setPricingCountry(country: PricingCountry) {
  emit({ ...state, country });
}

export function resetPricingState() {
  emit(INITIAL);
}
