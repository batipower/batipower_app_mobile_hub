import { useSyncExternalStore } from 'react';

import { EMPTY_FACET_FILTERS, type FacetFilters } from './domain/facets';

/** Sous-filtres de la liste « À traiter » (mêmes valeurs que le web). */
export type TodoFilter = 'all' | 'ready' | 'blocked' | 'review' | 'retry' | 'worse';

export type QueueFilters = {
  todo: TodoFilter;
  /** Recherche libre : référence, désignation ou demandeur. */
  search: string;
  facets: FacetFilters;
};

const INITIAL: QueueFilters = { todo: 'all', search: '', facets: EMPTY_FACET_FILTERS };

let state: QueueFilters = INITIAL;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

/** Filtres de la file, partagés entre la liste et la feuille des facettes. */
export function useQueueFilters(): QueueFilters {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getQueueFilters(): QueueFilters {
  return state;
}

export function patchQueueFilters(partial: Partial<QueueFilters>) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function resetQueueFilters() {
  state = INITIAL;
  listeners.forEach((listener) => listener());
}
