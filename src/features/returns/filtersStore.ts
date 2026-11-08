import { useSyncExternalStore } from 'react';

import type { ReturnHistoryType } from '@/api/hubReturns';

import type { ReturnHistorySource } from './constants';

/**
 * Filtres de l'historique des retours (source, état), tenus dans un store de module : la liste et
 * la feuille de filtres sont des routes distinctes qui doivent les partager. La recherche, elle,
 * vit dans la barre native de la liste. Remis à zéro à la déconnexion (`resetReturnsState`).
 */
export type ReturnsFilters = {
  source: ReturnHistorySource;
  type: ReturnHistoryType;
};

export const DEFAULT_RETURNS_FILTERS: ReturnsFilters = { source: 'ALL', type: 'ANY' };

let state: ReturnsFilters = DEFAULT_RETURNS_FILTERS;
const listeners = new Set<() => void>();

function emit(next: ReturnsFilters) {
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

export function useReturnsFilters(): ReturnsFilters {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function patchReturnsFilters(partial: Partial<ReturnsFilters>) {
  emit({ ...state, ...partial });
}

export function resetReturnsFilters() {
  emit(DEFAULT_RETURNS_FILTERS);
}

export function countActiveReturnsFilters(filters: ReturnsFilters): number {
  return (filters.source !== 'ALL' ? 1 : 0) + (filters.type !== 'ANY' ? 1 : 0);
}

export const resetReturnsState = resetReturnsFilters;
