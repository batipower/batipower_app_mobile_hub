import type { HubPricingAffaireOption, HubPricingFilters } from '@/types/hubPricing';

import { isSoldFilterActive } from './filters';
import {
  CATEGORY_TYPE_OPTIONS,
  returnTypeFilterLabel,
  soldChannelLabel,
  warehouseLabel,
} from './options';

export interface FilterChipDescriptor {
  key: string;
  label: string;
  /** Patch à appliquer pour retirer ce filtre. */
  clearPatch: Partial<HubPricingFilters>;
}

function buyBoxLabel(prefix: string, state: HubPricingFilters['buyBoxAmazon']) {
  if (state === 'true') return `${prefix} gagnée`;
  if (state === 'false') return `${prefix} perdue`;
  return '';
}

/** Libellés lisibles des filtres actifs (puces retirables), repris de `buildFilterChips` du web. */
export function buildFilterChips(
  filters: HubPricingFilters,
  affaires: HubPricingAffaireOption[] = [],
): FilterChipDescriptor[] {
  const chips: FilterChipDescriptor[] = [];

  if (filters.search.trim()) {
    chips.push({
      key: 'search',
      label: `Recherche : ${filters.search}`,
      clearPatch: { search: '' },
    });
  }
  if (filters.brands.length > 0) {
    chips.push({
      key: 'brands',
      label: filters.brands.length === 1 ? filters.brands[0]! : `${filters.brands.length} marques`,
      clearPatch: { brands: [] },
    });
  }
  if (filters.categoryTypes.length > 0) {
    const labels = filters.categoryTypes
      .map(
        (value) => CATEGORY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value,
      )
      .join(', ');
    chips.push({ key: 'svc', label: `Service : ${labels}`, clearPatch: { categoryTypes: [] } });
  }
  if (filters.warehouse) {
    chips.push({
      key: 'wh',
      label: `Affectation : ${warehouseLabel(filters.warehouse)}`,
      clearPatch: { warehouse: '' },
    });
  }
  if (filters.favorite != null) {
    chips.push({
      key: 'fav',
      label: filters.favorite ? 'Favoris' : 'Hors favoris',
      clearPatch: { favorite: null },
    });
  }
  if (filters.monitorBuyBox != null) {
    chips.push({
      key: 'mon',
      label: filters.monitorBuyBox ? 'Monitoré' : 'Non monitoré',
      clearPatch: { monitorBuyBox: null },
    });
  }
  if (filters.hasInternalStock != null) {
    chips.push({
      key: 'stock',
      label: filters.hasInternalStock ? 'Stock interne' : 'Sans stock interne',
      clearPatch: { hasInternalStock: null },
    });
  }
  if (filters.hasStock != null) {
    const warehouse = filters.stockWarehouse
      ? warehouseLabel(filters.stockWarehouse)
      : 'tous entrepôts';
    chips.push({
      key: 'hasStock',
      label: `${filters.hasStock ? 'Avec stock' : 'Sans stock'} · ${warehouse}`,
      clearPatch: { hasStock: null, stockWarehouse: '' },
    });
  }
  if (filters.hasActiveSupplierOrder) {
    chips.push({
      key: 'sup',
      label: `Cde fournisseur${filters.hasActiveSupplierOrder === 'any' ? '' : ` ${filters.hasActiveSupplierOrder}`}`,
      clearPatch: { hasActiveSupplierOrder: '' },
    });
  }
  if (filters.notOnWebsite) {
    chips.push({
      key: 'notOnWebsite',
      label: 'Non déployés site',
      clearPatch: { notOnWebsite: false },
    });
  }
  if (filters.sellingAtLoss) {
    chips.push({ key: 'loss', label: 'Vente à perte', clearPatch: { sellingAtLoss: false } });
  }
  if (filters.handlingRestricted != null) {
    chips.push({
      key: 'hr',
      label: filters.handlingRestricted ? 'Bloqués' : 'Non-bloqués',
      clearPatch: { handlingRestricted: null },
    });
  }
  if (filters.obsoletProduct != null) {
    chips.push({
      key: 'obs',
      label: filters.obsoletProduct ? 'Obsolètes' : 'Non-obsolètes',
      clearPatch: { obsoletProduct: null },
    });
  }
  if (filters.productTags.length > 0) {
    chips.push({
      key: 'tags',
      label:
        filters.productTags.length === 1
          ? `Tag : ${filters.productTags[0]}`
          : `${filters.productTags.length} tags`,
      clearPatch: { productTags: [] },
    });
  }
  if (filters.hasGoogleMerchant != null) {
    chips.push({ key: 'gm', label: 'Google Merchant', clearPatch: { hasGoogleMerchant: null } });
  }
  if (filters.affaireId) {
    const name = affaires.find((a) => a.uuid === filters.affaireId)?.name ?? 'Affaire';
    chips.push({ key: 'aff', label: `Affaire : ${name}`, clearPatch: { affaireId: '' } });
  }
  const buyBoxKeys = [
    ['buyBoxAmazon', 'Amazon'],
    ['buyBoxManoMano', 'ManoMano'],
    ['buyBoxLeroyMerlin', 'LM'],
    ['buyBoxCastorama', 'Casto'],
  ] as const;
  for (const [key, prefix] of buyBoxKeys) {
    const label = buyBoxLabel(prefix, filters[key]);
    if (label) chips.push({ key, label, clearPatch: { [key]: 'all' } });
  }
  if (filters.depreciatedFlevy !== 'all') {
    chips.push({
      key: 'depF',
      label: filters.depreciatedFlevy === 'true' ? 'Dép. Flevy' : 'Hors dép. Flevy',
      clearPatch: { depreciatedFlevy: 'all' },
    });
  }
  if (filters.depreciatedDombasle !== 'all') {
    chips.push({
      key: 'depD',
      label: filters.depreciatedDombasle === 'true' ? 'Dép. Dombasle' : 'Hors dép. Dombasle',
      clearPatch: { depreciatedDombasle: 'all' },
    });
  }
  if (filters.missedOpportunity) {
    chips.push({
      key: 'miss',
      label: `Opportunité ${filters.missedOpportunity}${filters.missedOpportunityStock ? ` / ${filters.missedOpportunityStock}` : ''}`,
      clearPatch: { missedOpportunity: '', missedOpportunityStock: '' },
    });
  }
  if (filters.buyboxToRemoveStock) {
    chips.push({
      key: 'danger',
      label: `BuyBox danger ${filters.buyboxToRemoveStock}`,
      clearPatch: { buyboxToRemoveStock: '' },
    });
  }
  if (filters.minStock != null) {
    chips.push({
      key: 'min',
      label: `Stock ≥ ${filters.minStock}`,
      clearPatch: { minStock: null },
    });
  }
  if (isSoldFilterActive(filters) && filters.soldChannel) {
    chips.push({
      key: 'sold',
      label: `${filters.soldMode === 'without' ? 'Sans vente' : 'Ventes'} ${soldChannelLabel(filters.soldChannel)} · ${filters.soldDays} j`,
      clearPatch: { soldChannel: '', soldDays: null, soldMode: 'with' },
    });
  }
  if (filters.returnType) {
    chips.push({
      key: 'returnType',
      label: `Retours : ${returnTypeFilterLabel(filters.returnType)}`,
      // Le tri `returnsCount` n'a de sens qu'avec ce filtre : on le retire avec lui.
      clearPatch:
        filters.sortBy === 'returnsCount' ? { returnType: '', sortBy: '' } : { returnType: '' },
    });
  }

  return chips;
}
