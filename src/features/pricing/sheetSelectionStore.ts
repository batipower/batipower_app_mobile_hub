import { useSyncExternalStore } from 'react';

import type { HubPricingRow } from '@/types/hubPricing';

/**
 * Sélection multiple de la liste Pricing pour le lancement groupé des fiches produit. Elle garde la
 * ligne complète (désignation, note du site) : elle survit aux changements de filtre et de page, et
 * la feuille de lancement y lit les produits sans les recharger.
 *
 * Seuls les produits non déployés sur le site (`websiteActive === false`) sont sélectionnables.
 */
type SelectionState = { items: ReadonlyMap<string, HubPricingRow> };

const EMPTY: SelectionState = { items: new Map() };

let state: SelectionState = EMPTY;
const listeners = new Set<() => void>();

function emit(items: Map<string, HubPricingRow>) {
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

/** Une ligne n'est sélectionnable que si le produit n'est pas encore déployé sur le site. */
export function isSheetSelectable(row: HubPricingRow): boolean {
  return row.websiteActive === false;
}

export function useSheetSelection(): ReadonlyMap<string, HubPricingRow> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).items;
}

export function getSheetSelectedRows(): HubPricingRow[] {
  return [...state.items.values()];
}

export function toggleSheetSelect(row: HubPricingRow) {
  const next = new Map(state.items);
  if (next.has(row.reference)) next.delete(row.reference);
  else if (isSheetSelectable(row)) next.set(row.reference, row);
  else return;
  emit(next);
}

export function selectManySheets(rows: readonly HubPricingRow[]) {
  const next = new Map(state.items);
  for (const row of rows) if (isSheetSelectable(row)) next.set(row.reference, row);
  emit(next);
}

export function clearSheetSelection() {
  if (state.items.size > 0) emit(new Map());
}
