import type { StagingFilters, StagingSortByApi } from '@/types/hubProductAnalyzer';
import { STAGING_PAGE_SIZE } from './constants';

export const DEFAULT_STAGING_FILTERS: StagingFilters = {
  view: 'staging',
  status: '',
  search: '',
  viability: 'all',
  country: '',
  weight: '',
  hasNego: false,
  needsNego: false,
  sortBy: 'lastAnalyzedAt',
  sortOrder: 'desc',
  inStock: false,
  stockReadiness: '',
  hasEan: '',
  hasAsin: '',
  hasEbat: '',
  minSales: false,
  minStockWh: '',
  stockDistributorIds: [],
  brands: [],
  conditioning: '',
  tags: [],
  affaire: false,
  affaireId: '',
  distributorId: '',
  offerTrack: '',
  missingCode: false,
  page: 1,
  limit: STAGING_PAGE_SIZE,
  ean: '',
  staging: '',
  obtainedPriceHT: '',
  launchedFromOpportunityUuid: '',
  detail: '',
};

const SORT_TO_API: Partial<Record<StagingSortByApi, string>> = {
  monthlyPotentialDE: 'monthlyPotential_DE',
  monthlyPotentialIT: 'monthlyPotential_IT',
  monthlyPotentialES: 'monthlyPotential_ES',
  monthlyPotentialUK: 'monthlyPotential_UK',
};

export function toStagingApiQuery(
  filters: StagingFilters,
  options?: { page?: number; limit?: number; forBrandList?: boolean; includeMarketplaces?: boolean },
): Record<string, string | number | boolean> {
  const page = options?.page ?? filters.page;
  const limit = options?.limit ?? filters.limit;
  const p: Record<string, string | number | boolean> = {
    page,
    limit,
    sortBy: SORT_TO_API[filters.sortBy] ?? filters.sortBy,
    sortOrder: filters.sortOrder,
    includeMarketplaces: options?.includeMarketplaces === false ? 'false' : 'true',
    includeAffaireLinks: 'true',
  };
  if (filters.status) p.status = filters.status;
  if (filters.search.trim()) p.search = filters.search.trim();
  if (filters.weight === 'pending') p.weightPending = 'true';
  else if (filters.weight === 'filled') p.hasWeight = 'true';
  if (filters.hasNego) p.hasOpenNegotiation = 'true';
  else if (filters.needsNego) p.hasOpenNegotiation = 'false';
  if (filters.country) {
    p.viabilityCountry = filters.country;
    if (filters.viability === 'viable') p.viabilityCountryStatus = 'VIABLE';
    else if (filters.viability === 'negotiable') p.viabilityCountryStatus = 'NEGOTIABLE';
    else if (filters.viability === 'not_viable') p.viabilityCountryStatus = 'NOT_VIABLE';
  } else if (filters.viability === 'viable') p.viabilityStatus = 'VIABLE';
  else if (filters.viability === 'negotiable') p.viabilityStatus = 'NEGOTIABLE';
  else if (filters.viability === 'not_viable') p.viabilityStatus = 'NOT_VIABLE';
  if (!options?.forBrandList) {
    if (filters.brands.length === 1) p.brand = filters.brands[0]!;
    else if (filters.brands.length > 1) p.brands = filters.brands.join(',');
  }
  if (filters.inStock) p.inStockOnly = 'true';
  if (filters.stockReadiness) p.stockReadiness = filters.stockReadiness;
  if (filters.hasEan) p.hasEan = filters.hasEan;
  if (filters.hasAsin) p.hasAsin = filters.hasAsin;
  if (filters.hasEbat) p.hasEbatCode = filters.hasEbat;
  if (filters.minSales) p.minMonthlySales = '1';
  const wh = parseInt(filters.minStockWh.trim(), 10);
  if (filters.minStockWh.trim() !== '' && !Number.isNaN(wh) && wh >= 0) {
    p.minStockWarehouse = String(wh);
  }
  if (filters.stockDistributorIds.length) p.stockDistributorIds = filters.stockDistributorIds.join(',');
  if (filters.tags.length) p.tags = filters.tags.join(',');
  if (filters.conditioning) p.conditioning = filters.conditioning;
  if (filters.affaire && filters.affaireId) p.affaireId = filters.affaireId;
  if (filters.distributorId) {
    p.distributorId = filters.distributorId;
    if (filters.missingCode) p.missingCodeDistributorId = filters.distributorId;
  }
  if (filters.offerTrack) p.track = filters.offerTrack;
  return p;
}
