import { apiClient } from '@/api/client';
import { toApiQuery } from '@/features/pricing/filters';
import type {
  HubPricingAffaireOption,
  HubPricingBrandsResponse,
  HubPricingFilters,
  HubPricingPage,
  HubPricingSelectionInsights,
  HubPricingSelectionStats,
  HubPricingSelectionStatsMonths,
  HubPricingStockValuation,
  HubPricingTagsResponse,
} from '@/types/hubPricing';

type Options = { signal?: AbortSignal };

/** Filtres de la sélection, sans pagination ni tri (stats, valorisation). */
function selectionQuery(filters: HubPricingFilters) {
  const query = toApiQuery(filters);
  delete query.page;
  delete query.limit;
  delete query.sortBy;
  delete query.sortOrder;
  return query;
}

/**
 * Page Pricing du HUB (`hub-app/pricing/*`). Le back réserve ces routes au SUPERADMIN :
 * l'app ne les appelle que pour ce rôle (`canAccessHubPricing`).
 */
export const hubPricingApi = {
  list(
    filters: HubPricingFilters,
    { signal, salesCountry }: Options & { salesCountry?: string | null } = {},
  ) {
    return apiClient.get<HubPricingPage>('hub-app/pricing', {
      query: salesCountry ? { ...toApiQuery(filters), salesCountry } : toApiQuery(filters),
      signal,
    });
  },

  brands(categoryType?: string, signal?: AbortSignal) {
    return apiClient.get<HubPricingBrandsResponse>('hub-app/pricing/brands', {
      query: categoryType ? { categoryType } : undefined,
      signal,
    });
  },

  tags(signal?: AbortSignal) {
    return apiClient.get<HubPricingTagsResponse>('hub-app/pricing/tags', { signal });
  },

  affaires(signal?: AbortSignal) {
    return apiClient.get<HubPricingAffaireOption[]>('hub-app/pricing/affaires', { signal });
  },

  /** Valorisation (stock QG × fixPriceHT) de la sélection filtrée. */
  stockValuation(filters: HubPricingFilters, { signal }: Options = {}) {
    return apiClient.get<HubPricingStockValuation>('hub-app/pricing/stock-valuation', {
      query: selectionQuery(filters),
      signal,
    });
  },

  selectionStats(
    filters: HubPricingFilters,
    months: HubPricingSelectionStatsMonths,
    { signal }: Options = {},
  ) {
    return apiClient.get<HubPricingSelectionStats>('hub-app/pricing/selection-stats', {
      query: { ...selectionQuery(filters), months },
      signal,
    });
  },

  selectionInsights(
    filters: HubPricingFilters,
    months: HubPricingSelectionStatsMonths,
    { signal }: Options = {},
  ) {
    return apiClient.get<HubPricingSelectionInsights>('hub-app/pricing/selection-insights', {
      query: { ...selectionQuery(filters), months },
      signal,
    });
  },
};
