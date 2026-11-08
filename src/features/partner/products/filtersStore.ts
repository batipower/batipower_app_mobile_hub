import type { PartnerDepWarehouse, PartnerNiveauCriticite } from '@/types/partnerProducts';

import { createFiltersStore } from '../shared/createFiltersStore';

/** Périmètre de la liste : catalogue standard ou produits en déstockage (DEP). */
export type ProductSegment = 'standard' | 'dep';

export type ProductsFilters = {
  segment: ProductSegment;
  brand: string | null;
  criticite: PartnerNiveauCriticite | null;
  /** Le dernier message attend ma réponse (standard). */
  awaitingMyReply: boolean;
  depWarehouse: PartnerDepWarehouse | null;
};

const store = createFiltersStore<ProductsFilters>({
  segment: 'standard',
  brand: null,
  criticite: null,
  awaitingMyReply: false,
  depWarehouse: null,
});

export const useProductsFilters = store.useFilters;
export const patchProductsFilters = store.patch;
/** Remise à zéro complète (déconnexion). */
export const resetProductsFilters = store.reset;

/** Efface les filtres de la liste en gardant le périmètre choisi. */
export function clearProductsFilters() {
  store.patch({ brand: null, criticite: null, awaitingMyReply: false, depWarehouse: null });
}

/** Nombre de filtres actifs du périmètre affiché (la pastille du bouton « Filtres »). */
export function countActiveProductsFilters(filters: ProductsFilters, segment: ProductSegment) {
  if (segment === 'dep') return (filters.brand ? 1 : 0) + (filters.depWarehouse ? 1 : 0);
  return (filters.brand ? 1 : 0) + (filters.criticite ? 1 : 0) + (filters.awaitingMyReply ? 1 : 0);
}
