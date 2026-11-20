import { apiClient } from '@/api/client';
import type { UpdateHubProductPayload } from '@/types/hubPricing';
import type {
  HubProductHeader,
  HubProductSearchHit,
  HubProductStatisticsResponse,
  HubProductStock,
  HubSalesDailyResponse,
  HubStatsPeriod,
} from '@/types/product';

/**
 * Fiches produit du module HUB (`hub-app/products/*`). Lecture : le back réserve ces routes
 * à SUPERADMIN et MANAGER (`HUB_PRODUCT_STOCK_ROLES`) : tout autre rôle reçoit un 403, l'app
 * ne les appelle donc que pour ces deux rôles (`canAccessHubProductSheet`). Écriture
 * (`update`) : SUPERADMIN uniquement, depuis la page Pricing.
 */
export const hubProductsApi = {
  /** Recherche par référence, EAN, SKU ou désignation. */
  search(q: string, limit = 8, signal?: AbortSignal) {
    return apiClient.get<HubProductSearchHit[]>('hub-app/products/search', {
      query: { q, limit },
      signal,
    });
  },

  getHeader(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubProductHeader>(`hub-app/products/${encodeURIComponent(reference)}`, {
      signal,
    });
  },

  getStock(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubProductStock>(
      `hub-app/products/${encodeURIComponent(reference)}/stock`,
      { signal },
    );
  },

  /** Ventes journalières (365 j par défaut, 400 au plus) : base des histogrammes mensuels. */
  getSalesDaily(reference: string, days = 365, signal?: AbortSignal) {
    return apiClient.get<HubSalesDailyResponse>(
      `hub-app/products/${encodeURIComponent(reference)}/sales/daily`,
      { query: { days }, signal },
    );
  },

  /** Prix et volumes par marketplace sur la période (avec cache côté back). */
  getSalesStatistics(reference: string, period: HubStatsPeriod = '1month', signal?: AbortSignal) {
    return apiClient.get<HubProductStatisticsResponse>(
      `hub-app/products/${encodeURIComponent(reference)}/sales/statistics`,
      { query: { period }, signal },
    );
  },

  /** Modification partielle d'un produit (SUPERADMIN) : édition légère de la page Pricing. */
  update(reference: string, payload: UpdateHubProductPayload) {
    return apiClient.patch<unknown>(`hub-app/products/${encodeURIComponent(reference)}`, payload);
  },
};
