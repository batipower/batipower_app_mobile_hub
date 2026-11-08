import { apiClient } from '@/api/client';
import type {
  InterAgencyAgencyInput,
  InterAgencyAgencyOption,
  InterAgencyChannel,
  InterAgencyField,
  InterAgencyImpossibleReason,
  InterAgencyMessage,
  InterAgencyOrder,
} from '@/types/partnerInterAgency';

/**
 * Inter-agences du module PARTNER (`buyer-app/inter-agency/*`). Contrat repris de
 * `front_externe_batipower/lib/api/inter-agency-orders.ts`.
 */

type Options = { signal?: AbortSignal };

const messagesPath = (orderReference: string) =>
  `buyer-app/inter-agency/${encodeURIComponent(orderReference)}/messages`;

export const partnerInterAgencyApi = {
  /** Commandes en cours, cloisonnées par le back au distributeur du compte. */
  listOrders(options?: Options) {
    return apiClient.get<InterAgencyOrder[]>('buyer-app/inter-agency/orders', {
      signal: options?.signal,
    });
  },

  listAgencies(options?: Options) {
    return apiClient.get<InterAgencyAgencyOption[]>('buyer-app/inter-agency/agencies', {
      signal: options?.signal,
    });
  },

  /** Bascule « Réalisée » (avec agences et commentaire) ou « Pré-réception ». */
  toggle(payload: {
    orderReference: string;
    warehouse: string;
    field: InterAgencyField;
    value: boolean;
    comment?: string;
    agencies?: InterAgencyAgencyInput[];
  }) {
    return apiClient.post<InterAgencyOrder>('buyer-app/inter-agency/toggle', payload);
  },

  /** Déclare (ou annule) l'impossibilité d'honorer ; le HUB est alerté à la déclaration. */
  setImpossible(payload: {
    orderReference: string;
    warehouse: string;
    value: boolean;
    reason?: InterAgencyImpossibleReason;
    comment?: string;
  }) {
    return apiClient.post<InterAgencyOrder>('buyer-app/inter-agency/impossible', payload);
  },

  listMessages(
    orderReference: string,
    warehouse: string,
    channel: InterAgencyChannel,
    options?: Options,
  ) {
    return apiClient.get<InterAgencyMessage[]>(messagesPath(orderReference), {
      query: { warehouse, channel },
      signal: options?.signal,
    });
  },

  postMessage(orderReference: string, warehouse: string, channel: InterAgencyChannel, content: string) {
    return apiClient.post<InterAgencyMessage>(
      messagesPath(orderReference),
      { content },
      { query: { warehouse, channel } },
    );
  },
};
