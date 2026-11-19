import { apiClient } from '@/api/client';
import type {
  HubCreateOfferPayload,
  HubDeployAsinPayload,
  HubEnvelope,
  HubLinkEanPayload,
  HubMarketplaceKey,
  HubProductPricing,
  HubUpdateOfferPayload,
} from '@/types/hubProductMarketplaces';

const base = (reference: string) => `hub-app/products/${encodeURIComponent(reference)}`;
const marketplaceBase = (reference: string, marketplace: HubMarketplaceKey) =>
  `${base(reference)}/marketplaces/${marketplace}`;

/**
 * Prix et marketplaces d'une fiche produit. Lecture : SUPERADMIN et MANAGER. Les actions
 * d'écriture sont réservées au SUPERADMIN côté back (un MANAGER recevrait un 403) : l'app ne
 * les propose qu'à ce rôle.
 */
export const hubProductMarketplacesApi = {
  getPricing(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubProductPricing>(`${base(reference)}/pricing`, { signal });
  },

  setAvailability(
    reference: string,
    marketplace: HubMarketplaceKey,
    payload: { notAvailable: boolean; country?: string },
  ) {
    return apiClient.put<HubEnvelope>(`${marketplaceBase(reference, marketplace)}/availability`, payload);
  },

  setSellerName(reference: string, marketplace: HubMarketplaceKey, payload: { sellerName: string }) {
    return apiClient.put<HubEnvelope>(`${marketplaceBase(reference, marketplace)}/seller-name`, payload);
  },

  syncSku(reference: string, marketplace: HubMarketplaceKey) {
    return apiClient.post<HubEnvelope>(`${marketplaceBase(reference, marketplace)}/sync-sku`, {});
  },

  linkEan(reference: string, marketplace: HubMarketplaceKey, payload: HubLinkEanPayload) {
    return apiClient.post<HubEnvelope>(`${marketplaceBase(reference, marketplace)}/link-ean`, payload);
  },

  createOffer(reference: string, marketplace: HubMarketplaceKey, payload: HubCreateOfferPayload) {
    return apiClient.post<HubEnvelope>(`${marketplaceBase(reference, marketplace)}/offers`, payload);
  },

  updateOffer(reference: string, marketplace: HubMarketplaceKey, payload: HubUpdateOfferPayload) {
    return apiClient.put<HubEnvelope>(`${marketplaceBase(reference, marketplace)}/offers`, payload);
  },

  previewAmazonAsin(reference: string, payload: HubDeployAsinPayload) {
    return apiClient.post<HubEnvelope>(
      `${marketplaceBase(reference, 'amazon')}/offers/asin/preview`,
      payload,
    );
  },

  deployAmazonAsin(reference: string, payload: HubDeployAsinPayload) {
    return apiClient.post<HubEnvelope>(`${marketplaceBase(reference, 'amazon')}/offers/asin`, payload);
  },

  forceDelist(reference: string, marketplace: HubMarketplaceKey, payload: { country?: string }) {
    return apiClient.post<HubEnvelope>(`${marketplaceBase(reference, marketplace)}/delist`, payload);
  },
};
