import { apiClient } from '@/api/client';
import type {
  DriversTourResult,
  PreparationOrdersResponse,
  PreparationScope,
} from '@/types/preparation';

/**
 * Endpoints de la préparation HUB (`/hub-app/orders/preparation*`), réservés au module HUB.
 * Consultation, plus la génération d'étiquettes transporteur depuis le scan caméra.
 */
export const preparationApi = {
  getOrders(scope: PreparationScope, limit = 500) {
    return apiClient.get<PreparationOrdersResponse>('/hub-app/orders/preparation', {
      query: { scope, limit },
    });
  },

  /** Articles à récupérer en agence proche, regroupés par agence. */
  getDriversTour() {
    return apiClient.get<DriversTourResult>('/hub-app/orders/preparation/drivers-tour');
  },

  /** Rattache la commande à l'entrepôt (QG) avant l'étiquette. */
  updateOrigin(reference: string, origin: string) {
    return apiClient.put<unknown>(`/hub-app/orders/${encodeURIComponent(reference)}/origin`, {
      origin,
    });
  },

  /**
   * Met en file la génération de l'étiquette : le serveur l'envoie ensuite à l'imprimante
   * thermique de l'entrepôt. Mêmes appels que `front_externe_batipower/lib/api/hub-preparation.ts`.
   */
  generateLabel(referenceOrder: string, nbColis: number) {
    return apiClient.post<unknown>('/hub-app/orders/labels/generate', {
      referenceOrder,
      nbColis,
      logisticsReferences: Array.from({ length: nbColis }, () => ''),
    });
  },
};
