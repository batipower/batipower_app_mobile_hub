import { apiClient } from '@/api/client';
import type {
  HubLogisticsDetail,
  HubOrdersByProductResult,
  HubSavSearchResult,
} from '@/types/order';

type SearchOptions = {
  page?: number;
  limit?: number;
  /** Aperçu léger (quelques résultats, sans facettes ni retours enrichis) pour la saisie en direct. */
  preview?: boolean;
  signal?: AbortSignal;
};

/**
 * Commandes du module HUB (`hub-app/orders/*`), en lecture seule. Ouvertes à tout compte
 * possédant le module HUB : le back le vérifie sur tout le préfixe `/hub-app`.
 */
export const hubOrdersApi = {
  /** Recherche libre : référence, référence eBat, téléphone, n° de suivi, email, nom. */
  searchSav(searchTerm: string, { page = 1, limit = 20, preview, signal }: SearchOptions = {}) {
    return apiClient.get<HubSavSearchResult>('hub-app/orders/search-sav', {
      query: { searchTerm, page, limit, preview: preview ? true : undefined },
      signal,
    });
  },

  /** Commandes qui contiennent une référence produit (référence, ou référence entrepôt). */
  searchByProductReference(
    reference: string,
    { page = 1, limit = 20, preview, signal }: SearchOptions = {},
  ) {
    return apiClient.get<HubOrdersByProductResult>('hub-app/orders/search-by-product-reference', {
      query: {
        reference,
        page,
        limit,
        exactMatch: false,
        preview: preview ? true : undefined,
      },
      signal,
    });
  },

  getLogisticsDetail(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubLogisticsDetail>(
      `hub-app/orders/logistics-detail/${encodeURIComponent(reference)}`,
      { signal },
    );
  },
};
