import { apiClient } from '@/api/client';
import type {
  PartnerLatestPriceChangeRow,
  PartnerLatestPriceRow,
  PartnerOpportunitiesOverview,
  PartnerPaginatedResponse,
  PartnerPriceChangesByBrand,
  PartnerPriceChangesByUser,
  PartnerPriceChangesOverview,
  PartnerPricesParams,
  PartnerStatsRange,
} from '@/types/hubPartnerStats';

type ReadOptions = { signal?: AbortSignal };

const BASE = 'hub-app/partner-stats';

function rangeQuery({ startDate, endDate }: PartnerStatsRange) {
  return { startDate, endDate };
}

/**
 * Stats PARTNER du HUB (`hub-app/partner-stats/*`, SUPERADMIN), en lecture seule. Pendant mobile de
 * `front_externe_batipower/lib/api/hub-partner-stats.ts`, sans les filtres marque / utilisateur.
 */
export const hubPartnerStatsApi = {
  opportunitiesOverview(range: PartnerStatsRange, { signal }: ReadOptions = {}) {
    return apiClient.get<PartnerOpportunitiesOverview>(`${BASE}/opportunities/overview`, {
      query: rangeQuery(range),
      signal,
    });
  },

  latestPrices(params: PartnerPricesParams, { signal }: ReadOptions = {}) {
    return apiClient.get<PartnerPaginatedResponse<PartnerLatestPriceRow>>(
      `${BASE}/opportunities/latest-prices`,
      { query: { ...rangeQuery(params), page: params.page, limit: params.limit }, signal },
    );
  },

  priceChangesOverview(range: PartnerStatsRange, { signal }: ReadOptions = {}) {
    return apiClient.get<PartnerPriceChangesOverview>(`${BASE}/price-changes/overview`, {
      query: rangeQuery(range),
      signal,
    });
  },

  priceChangesByBrand(range: PartnerStatsRange, { signal }: ReadOptions = {}) {
    return apiClient.get<PartnerPriceChangesByBrand>(`${BASE}/price-changes/by-brand`, {
      query: rangeQuery(range),
      signal,
    });
  },

  priceChangesByUser(range: PartnerStatsRange, { signal }: ReadOptions = {}) {
    return apiClient.get<PartnerPriceChangesByUser>(`${BASE}/price-changes/by-user`, {
      query: rangeQuery(range),
      signal,
    });
  },

  latestPriceChanges(params: PartnerPricesParams, { signal }: ReadOptions = {}) {
    return apiClient.get<PartnerPaginatedResponse<PartnerLatestPriceChangeRow>>(
      `${BASE}/price-changes/latest`,
      { query: { ...rangeQuery(params), page: params.page, limit: params.limit }, signal },
    );
  },
};
