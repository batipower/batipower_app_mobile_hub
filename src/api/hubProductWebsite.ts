import { apiClient } from '@/api/client';
import type {
  HubWebsitePricing,
  UpdateHubWebsiteDisplayPricePayload,
} from '@/types/hubWebsite';

/**
 * Prix du produit sur le site (`hub-app/products/:reference/website/*`). Le back accepte
 * SUPERADMIN et MANAGER pour le prix, mais n'envoie la marge qu'au SUPERADMIN : l'app ne
 * propose cette section qu'au SUPERADMIN (`canEditHubWebsitePrice`).
 */
export const hubProductWebsiteApi = {
  getPricing(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubWebsitePricing>(
      `hub-app/products/${encodeURIComponent(reference)}/website/pricing`,
      { signal },
    );
  },

  /** Modifie le prix catalogue : écrit dans PrestaShop puis réindexe le site. */
  updateDisplayPrice(reference: string, payload: UpdateHubWebsiteDisplayPricePayload) {
    return apiClient.put<HubWebsitePricing>(
      `hub-app/products/${encodeURIComponent(reference)}/website/display-price`,
      payload,
    );
  },
};
