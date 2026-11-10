import { apiClient } from '@/api/client';
import type {
  CollecteActionResult,
  CollecteMinHours,
  CollecteWarehouse,
  LabelCarrierCheck,
  OrderLabelsStatus,
  UncollectedResponse,
} from '@/types/hubCollecte';

type ReadOptions = { signal?: AbortSignal };

const BASE = 'hub-app/collecte';

/**
 * Collecte entrepôt du HUB (`hub-app/collecte/*`, SUPERADMIN et MANAGER). Pendant mobile de
 * `front_externe_batipower/lib/api/hub-collecte.ts`.
 */
export const hubCollecteApi = {
  uncollected(warehouse: CollecteWarehouse, minHours: CollecteMinHours, { signal }: ReadOptions = {}) {
    return apiClient.get<UncollectedResponse>(`${BASE}/uncollected`, {
      query: { warehouse, minHours },
      signal,
    });
  },

  orderLabelsStatus(reference: string, { signal }: ReadOptions = {}) {
    return apiClient.get<OrderLabelsStatus>(
      `${BASE}/orders/${encodeURIComponent(reference)}/labels-status`,
      { signal },
    );
  },

  /** Contrôle transporteur d'UNE étiquette de la commande (appelé étiquette par étiquette). */
  checkLabelCarrier(reference: string, trackingNumber: string, { signal }: ReadOptions = {}) {
    return apiClient.get<LabelCarrierCheck>(
      `${BASE}/orders/${encodeURIComponent(reference)}/labels/${encodeURIComponent(trackingNumber)}/carrier-check`,
      { signal },
    );
  },

  /** Passe la commande en « Collecté » (colis sur palette non scannés un par un). */
  markCollected(reference: string) {
    return apiClient.post<CollecteActionResult>(
      `${BASE}/orders/${encodeURIComponent(reference)}/mark-collected`,
    );
  },

  /** Passe la commande en « Livré ». */
  markDelivered(reference: string) {
    return apiClient.post<CollecteActionResult>(
      `${BASE}/orders/${encodeURIComponent(reference)}/mark-delivered`,
    );
  },
};
