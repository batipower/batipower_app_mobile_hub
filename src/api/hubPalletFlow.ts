import { apiClient } from '@/api/client';
import type {
  HubMarginSimulationResponse,
  HubPalletCandidatesResponse,
  HubPalletQuoteRequestResponse,
  HubPalletQuotesResponse,
  HubPalletRevertResponse,
} from '@/types/hubPalletFlow';

const enc = encodeURIComponent;

/**
 * Flux palette du HUB : candidats à arbitrer, devis, marge, et les deux décisions (demander le prix
 * palette, ou revenir au flux classique). La fiche de la commande passe par `hubOrdersApi`.
 * Réservé au SUPERADMIN côté app ; le back restreint la liste et la simulation de marge.
 */
export const hubPalletFlowApi = {
  listCandidates(signal?: AbortSignal) {
    return apiClient.get<HubPalletCandidatesResponse>('hub-app/pallet-flow/candidates', { signal });
  },

  getMarginSimulation(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubMarginSimulationResponse>(
      `hub-app/orders/${enc(reference)}/margin-simulation`,
      { signal },
    );
  },

  getQuotesByOrder(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubPalletQuotesResponse>(
      `hub-app/orders/pallet-quote/by-order/${enc(reference)}`,
      { signal },
    );
  },

  /** Demande le prix palette au dépôt (email envoyé). */
  requestQuote(body: { orderReference: string; warehouse: string; requesterComment?: string }) {
    return apiClient.post<HubPalletQuoteRequestResponse>('hub-app/orders/pallet-quote', body);
  },

  /** Renvoie la commande en flux classique. */
  revertToClassic(reference: string) {
    return apiClient.post<HubPalletRevertResponse>(
      `hub-app/orders/${enc(reference)}/pallet-flow/classic`,
    );
  },
};
