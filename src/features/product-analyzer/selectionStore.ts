import { useSyncExternalStore } from 'react';

import type { StagingItem } from '@/types/hubProductAnalyzer';

/**
 * Sélection multiple de l'historique. Elle garde l'élément complet (et pas seulement son id) :
 * elle survit aux changements de filtre et de page, et les feuilles d'action (négociation,
 * lancement, affaire…) y lisent les produits sans les recharger.
 */
type SelectionState = { items: ReadonlyMap<string, StagingItem> };

const EMPTY: SelectionState = { items: new Map() };

let state: SelectionState = EMPTY;
const listeners = new Set<() => void>();

function emit(items: Map<string, StagingItem>) {
  state = { items };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

export function useSelection(): ReadonlyMap<string, StagingItem> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).items;
}

export function getSelection(): ReadonlyMap<string, StagingItem> {
  return state.items;
}

export function getSelectedItems(): StagingItem[] {
  return [...state.items.values()];
}

export function toggleSelect(item: StagingItem) {
  const next = new Map(state.items);
  if (next.has(item.uuid)) next.delete(item.uuid);
  else next.set(item.uuid, item);
  emit(next);
}

export function selectMany(items: readonly StagingItem[]) {
  const next = new Map(state.items);
  for (const item of items) next.set(item.uuid, item);
  emit(next);
}

export function deselectMany(uuids: readonly string[]) {
  const next = new Map(state.items);
  for (const uuid of uuids) next.delete(uuid);
  emit(next);
}

export function clearSelection() {
  if (state.items.size > 0) emit(new Map());
}
