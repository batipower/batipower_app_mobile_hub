import { useSyncExternalStore } from 'react';

import type { MarginView, PeriodPresetId, SortKey } from './lib/model';

/**
 * Filtres de la page « Marges marques » (période, filiales, marketplace, vue avec / sans SAV, tri),
 * tenus dans un store de module : la liste, la fiche marque et la feuille de filtres sont des routes
 * distinctes qui doivent les partager. La recherche de marque, elle, vit dans la barre native de
 * la liste. Remis à zéro à la déconnexion (`resetBrandMarginState`).
 */
export type BrandMarginFilters = {
  period: PeriodPresetId;
  /** Début de la période personnalisée (`YYYY-MM-DD`), utilisé si `period === 'custom'`. */
  from: string;
  /** Fin de la période personnalisée (`YYYY-MM-DD`). */
  to: string;
  /** Codes d'entrepôt (filiales) triés ; vide = toutes. */
  warehouses: string[];
  /** Marketplace (`null` = toutes). */
  origin: string | null;
  view: MarginView;
  sort: SortKey;
  desc: boolean;
  /** Liste : seulement les marques en alerte. */
  alertsOnly: boolean;
  /** Liste : détail de l'impact SAV par cause sur chaque marque. */
  showSavCauses: boolean;
};

export const DEFAULT_BRAND_MARGIN_FILTERS: BrandMarginFilters = {
  period: 'month',
  from: '',
  to: '',
  warehouses: [],
  origin: null,
  view: 'net',
  sort: 'caHT',
  desc: true,
  alertsOnly: false,
  showSavCauses: false,
};

let state: BrandMarginFilters = DEFAULT_BRAND_MARGIN_FILTERS;
const listeners = new Set<() => void>();

function emit(next: BrandMarginFilters) {
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

export function useBrandMarginFilters(): BrandMarginFilters {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function patchBrandMarginFilters(partial: Partial<BrandMarginFilters>) {
  emit({ ...state, ...partial });
}

export function resetBrandMarginFilters() {
  emit(DEFAULT_BRAND_MARGIN_FILTERS);
}

/** Ajoute ou retire un entrepôt du filtre filiales. */
export function toggleBrandMarginWarehouse(code: string) {
  const next = state.warehouses.includes(code)
    ? state.warehouses.filter((item) => item !== code)
    : [...state.warehouses, code].sort();
  emit({ ...state, warehouses: next });
}

/**
 * Filtres qui s'écartent des valeurs par défaut (période, filiales, marketplace, tri). La vue, le
 * filtre d'alertes et l'affichage du SAV par cause ont leurs propres commandes dans la liste.
 */
export function countActiveBrandMarginFilters(filters: BrandMarginFilters): number {
  const defaults = DEFAULT_BRAND_MARGIN_FILTERS;
  return (
    (filters.period !== defaults.period ? 1 : 0) +
    (filters.warehouses.length > 0 ? 1 : 0) +
    (filters.origin !== defaults.origin ? 1 : 0) +
    (filters.sort !== defaults.sort || filters.desc !== defaults.desc ? 1 : 0)
  );
}

export const resetBrandMarginState = resetBrandMarginFilters;
