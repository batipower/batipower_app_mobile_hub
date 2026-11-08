import { useSyncExternalStore } from 'react';

import { DEFAULT_STAGING_FILTERS } from '@/features/product-analyzer/lib/filters';
import { STAGING_RESET_PATCH, hasActiveStagingFilters } from '@/features/product-analyzer/lib/filter-labels';
import type { StagingFilters } from '@/types/hubProductAnalyzer';

/**
 * Filtres de l'historique Product Analyzer, tenus dans un store de module : la liste et les
 * feuilles (filtres, tri, choix) sont des routes distinctes qui doivent les partager. Il vit
 * pour la durée de la session ; `resetPaState` le remet à zéro à la déconnexion.
 */
type PaFiltersState = { filters: StagingFilters };

const INITIAL: PaFiltersState = { filters: DEFAULT_STAGING_FILTERS };

let state: PaFiltersState = INITIAL;
const listeners = new Set<() => void>();

function emit(next: PaFiltersState) {
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

export function usePaFilters(): StagingFilters {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).filters;
}

export function getPaFilters(): StagingFilters {
  return state.filters;
}

/** Applique un patch aux filtres (la pagination est portée par la requête infinie). */
export function patchPaFilters(partial: Partial<StagingFilters>) {
  emit({ filters: { ...state.filters, ...partial } });
}

/** Remet les filtres à zéro ; le tri est conservé, la recherche aussi (barre native de l'écran). */
export function resetPaFilters() {
  emit({
    filters: {
      ...state.filters,
      ...STAGING_RESET_PATCH,
      affaire: false,
      affaireId: '',
      distributorId: '',
      offerTrack: '',
      missingCode: false,
    },
  });
}

export function resetPaState() {
  emit(INITIAL);
}

/** Nombre de filtres actifs (hors tri) : pastille du bouton « Filtres ». */
export function countPaFilters(f: StagingFilters): number {
  let count = 0;
  if (f.status !== '') count += 1;
  if (f.country !== '') count += 1;
  if (f.weight !== '') count += 1;
  if (f.hasNego) count += 1;
  if (f.needsNego) count += 1;
  if (f.hasEan !== '') count += 1;
  if (f.hasAsin !== '') count += 1;
  if (f.hasEbat !== '') count += 1;
  if (f.minSales) count += 1;
  if (f.inStock) count += 1;
  if (f.stockReadiness !== '') count += 1;
  if (f.minStockWh !== '') count += 1;
  if (f.stockDistributorIds.length > 0) count += 1;
  if (f.brands.length > 0) count += 1;
  if (f.tags.length > 0) count += 1;
  if (f.conditioning !== '') count += 1;
  if (f.affaire && f.affaireId) count += 1;
  if (f.distributorId) count += 1;
  if (f.offerTrack) count += 1;
  if (f.missingCode) count += 1;
  return count;
}

export { hasActiveStagingFilters };
