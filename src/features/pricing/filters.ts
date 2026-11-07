import type { HubPricingFilters } from '@/types/hubPricing';

import { isSoldFilterActive } from './soldFilter';

export { isSoldFilterActive };

/** Filtres par défaut : catalogue complet, page 1, 50 lignes. */
export const DEFAULT_FILTERS: HubPricingFilters = {
  search: '',
  brands: [],
  categoryTypes: [],
  warehouse: '',
  favorite: null,
  monitorBuyBox: null,
  hasInternalStock: null,
  hasStock: null,
  stockWarehouse: '',
  hasActiveSupplierOrder: '',
  handlingRestricted: null,
  obsoletProduct: null,
  productTags: [],
  sellingAtLoss: false,
  hasGoogleMerchant: null,
  notOnWebsite: false,
  affaireId: '',
  buyBoxAmazon: 'all',
  buyBoxManoMano: 'all',
  buyBoxLeroyMerlin: 'all',
  buyBoxCastorama: 'all',
  depreciatedFlevy: 'all',
  depreciatedDombasle: 'all',
  missedOpportunity: '',
  missedOpportunityStock: '',
  buyboxToRemoveStock: '',
  minStock: null,
  soldChannel: '',
  soldDays: null,
  soldMode: 'with',
  returnType: '',
  sortBy: '',
  sortOrder: 'desc',
  page: 1,
  limit: 50,
};

/** Nombre de filtres actifs (hors tri et pagination), pour le badge du bouton Filtres. */
export function countActiveFilters(filters: HubPricingFilters): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  if (filters.brands.length > 0) count += 1;
  if (filters.categoryTypes.length > 0) count += 1;
  if (filters.warehouse) count += 1;
  if (filters.favorite != null) count += 1;
  if (filters.monitorBuyBox != null) count += 1;
  if (filters.hasInternalStock != null) count += 1;
  if (filters.hasStock != null) count += 1;
  if (filters.hasActiveSupplierOrder) count += 1;
  if (filters.handlingRestricted != null) count += 1;
  if (filters.obsoletProduct != null) count += 1;
  if (filters.productTags.length > 0) count += 1;
  if (filters.sellingAtLoss) count += 1;
  if (filters.hasGoogleMerchant != null) count += 1;
  if (filters.notOnWebsite) count += 1;
  if (filters.affaireId) count += 1;
  if (filters.buyBoxAmazon !== 'all') count += 1;
  if (filters.buyBoxManoMano !== 'all') count += 1;
  if (filters.buyBoxLeroyMerlin !== 'all') count += 1;
  if (filters.buyBoxCastorama !== 'all') count += 1;
  if (filters.depreciatedFlevy !== 'all') count += 1;
  if (filters.depreciatedDombasle !== 'all') count += 1;
  if (filters.missedOpportunity) count += 1;
  if (filters.buyboxToRemoveStock) count += 1;
  if (filters.minStock != null) count += 1;
  if (isSoldFilterActive(filters)) count += 1;
  if (filters.returnType) count += 1;
  return count;
}

/**
 * Query params de `GET hub-app/pricing` (contrat ApproRows), identiques à `toApiQuery` du web.
 * Les clés `missed-opportunities-*` et `buybox-to-remove-stock-*` sont dynamiques ;
 * « non déployés » devient `websiteActive=false`.
 */
export function toApiQuery(filters: HubPricingFilters): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {
    page: filters.page,
    limit: filters.limit,
  };

  if (filters.search.trim()) query.search = filters.search.trim();
  if (filters.brands.length > 0) query.brands = filters.brands.join(',');
  if (filters.categoryTypes.length > 0) query.categoryType = filters.categoryTypes.join(',');
  if (filters.warehouse) query.warehouse = filters.warehouse;
  if (filters.favorite != null) query.favorite = filters.favorite;
  if (filters.monitorBuyBox != null) query.monitorBuyBox = filters.monitorBuyBox;
  if (filters.hasInternalStock != null) query.hasInternalStock = filters.hasInternalStock;
  if (filters.hasStock != null) {
    query.hasStock = filters.hasStock;
    if (filters.stockWarehouse) query.stockWarehouse = filters.stockWarehouse;
  }
  if (filters.hasActiveSupplierOrder) query.hasActiveSupplierOrder = filters.hasActiveSupplierOrder;
  if (filters.handlingRestricted != null) query.handlingRestricted = filters.handlingRestricted;
  if (filters.obsoletProduct != null) query.obsoletProduct = filters.obsoletProduct;
  if (filters.productTags.length > 0) query.productTags = filters.productTags.join(',');
  if (filters.sellingAtLoss) query.sellingAtLoss = true;
  if (filters.hasGoogleMerchant != null) query.hasGoogleMerchant = filters.hasGoogleMerchant;
  if (filters.notOnWebsite) query.websiteActive = false;
  if (filters.affaireId) query.affaireId = filters.affaireId;
  if (filters.buyBoxAmazon !== 'all') query.isActualBuyBoxAmazon = filters.buyBoxAmazon === 'true';
  if (filters.buyBoxManoMano !== 'all') {
    query.isActualBuyBoxManoMano = filters.buyBoxManoMano === 'true';
  }
  if (filters.buyBoxLeroyMerlin !== 'all') {
    query.isActualBuyBoxLeroyMerlin = filters.buyBoxLeroyMerlin === 'true';
  }
  if (filters.buyBoxCastorama !== 'all') {
    query.isActualBuyBoxCastorama = filters.buyBoxCastorama === 'true';
  }
  if (filters.depreciatedFlevy !== 'all')
    query.depreciatedFlevy = filters.depreciatedFlevy === 'true';
  if (filters.depreciatedDombasle !== 'all') {
    query.depreciatedDombasle = filters.depreciatedDombasle === 'true';
  }

  if (filters.missedOpportunity) {
    const mp = filters.missedOpportunity;
    const stock = filters.missedOpportunityStock;
    if (stock === 'flevy') query[`missed-opportunities-${mp}-with-stock-flevy`] = true;
    else if (stock === 'dombasle') query[`missed-opportunities-${mp}-with-stock-dombasle`] = true;
    else if (stock === 'qg') query[`missed-opportunities-${mp}-with-stock-qg-batipower`] = true;
    else query[`missed-opportunities-${mp}`] = true;
  }

  if (filters.buyboxToRemoveStock) {
    const key =
      filters.buyboxToRemoveStock === 'qg'
        ? 'buybox-to-remove-stock-qg-batipower'
        : `buybox-to-remove-stock-${filters.buyboxToRemoveStock}`;
    query[key] = true;
  }
  if (filters.minStock != null) query.minStock = filters.minStock;
  if (filters.soldChannel && filters.soldDays != null) {
    query.soldChannel = filters.soldChannel;
    query.soldDays = filters.soldDays;
    query.soldMode = filters.soldMode;
  }
  if (filters.returnType) query.returnType = filters.returnType;
  if (filters.sortBy) {
    query.sortBy = filters.sortBy;
    query.sortOrder = filters.sortOrder;
  }
  return query;
}

/** Le filtre « stock QG » est actif : seul cas où la valorisation du stock a un sens. */
export function isQgStockFilter(filters: Pick<HubPricingFilters, 'hasStock' | 'stockWarehouse'>) {
  return filters.hasStock === true && filters.stockWarehouse === 'QG_BATIPOWER';
}
