import { apiClient } from '@/api/client';
import type {
  DriversTourResult,
  PreparationOrdersResponse,
  PreparationScope,
} from '@/types/preparation';

/**
 * Endpoints de la préparation HUB (`/hub-app/orders/preparation*`), réservés au module HUB.
 * Lecture seule : l'app mobile n'imprime ni ne transfère rien en V1.
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
};
