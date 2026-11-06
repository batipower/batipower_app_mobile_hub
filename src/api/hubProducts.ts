import { apiClient } from '@/api/client';
import type { HubProductHeader, HubProductSearchHit, HubProductStock } from '@/types/product';

/**
 * Fiches produit du module HUB (`hub-app/products/*`), en lecture seule. Le back réserve
 * ces routes à SUPERADMIN et MANAGER (`HUB_PRODUCT_STOCK_ROLES`) : tout autre rôle reçoit
 * un 403, l'app ne les appelle donc que pour ces deux rôles (`canAccessHubProductSheet`).
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
};
