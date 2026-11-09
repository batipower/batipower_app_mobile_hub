import { router } from 'expo-router';

/** Navigation interne à la page Pricing (onglet Menu) : tout s'empile dans sa pile. */

export type PricingPickerKind = 'brands' | 'tags' | 'affaires' | 'edit-tags';

export function openPricingRow(reference: string) {
  router.push({ pathname: '/hub/pricing/[reference]', params: { reference } });
}

export function openPricingFilters() {
  router.push('/hub/pricing/filtres');
}

export function openPricingSort() {
  router.push('/hub/pricing/tri');
}

export function openPricingStats() {
  router.push('/hub/pricing/stats');
}

/** Feuille de choix (marques, tags, affaires) ; `reference` seulement pour l'édition des tags d'une ligne. */
export function openPricingPicker(kind: PricingPickerKind, reference?: string) {
  router.push({ pathname: '/hub/pricing/choix/[kind]', params: { kind, reference } });
}

export type PricingEditField =
  | 'fixPriceHT'
  | 'nbPieceByColis'
  | 'previSalesByMonth'
  | 'targetPriceAmazon'
  | 'targetPriceManoMano'
  | 'targetPriceLeroyMerlin'
  | 'targetPriceCastorama'
  | 'targetPriceBricoman';

/** Feuille d'édition d'une valeur numérique d'une ligne. */
export function openPricingEdit(reference: string, field: PricingEditField) {
  router.push({ pathname: '/hub/pricing/editer', params: { reference, field } });
}
