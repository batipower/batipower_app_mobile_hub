import { apiClient } from '@/api/client';
import type {
  PartnerDeliveryNote,
  PartnerDeliveryNoteDetail,
  PartnerDeliveryNoteLinesResponse,
  PartnerDeliveryNoteMessage,
} from '@/types/partnerDeliveryNotes';

/**
 * BL à corriger du module PARTNER (`buyer-app/delivery-note-assignments/*`). Contrat repris de
 * `front_externe_batipower/lib/api/delivery-note-assignments.ts`, limité à la consultation, au
 * statut « traité » et à la conversation : ni PDF, ni audit, ni actions SUPERADMIN sur mobile.
 */

type Options = { signal?: AbortSignal };

export interface PartnerDeliveryNoteLinesParams {
  /** `true` : BL traités ; `false` : BL à traiter. */
  treated: boolean;
  brands?: string[];
  limit: number;
  offset: number;
}

const base = 'buyer-app/delivery-note-assignments';

export const partnerDeliveryNotesApi = {
  /** Lignes en écart de prix, triées de la plus récente à la plus ancienne. */
  listLines(params: PartnerDeliveryNoteLinesParams, options?: Options) {
    return apiClient.get<PartnerDeliveryNoteLinesResponse>(`${base}/lines`, {
      query: {
        treated: String(params.treated),
        brands: params.brands && params.brands.length > 0 ? params.brands.join(',') : undefined,
        sortBy: 'date',
        sortOrder: 'desc',
        limit: params.limit,
        offset: params.offset,
      },
      signal: options?.signal,
    });
  },

  /** Nombre de lignes traitées ou à traiter (barre de progression) : une page d'une ligne suffit. */
  linesCount(treated: boolean, brands: string[] | undefined, options?: Options) {
    return partnerDeliveryNotesApi
      .listLines({ treated, brands, limit: 1, offset: 0 }, options)
      .then((res) => res.total);
  },

  /** BL à traiter (badge de l'onglet). */
  pendingCount(options?: Options) {
    return apiClient.get<{ count: number }>(`${base}/pending-count`, { signal: options?.signal });
  },

  listBrands(options?: Options) {
    return apiClient.get<string[]>(`${base}/brands`, { signal: options?.signal });
  },

  detail(deliveryNoteUuid: string, options?: Options) {
    return apiClient.get<PartnerDeliveryNoteDetail>(`${base}/${deliveryNoteUuid}`, {
      signal: options?.signal,
    });
  },

  markTreated: (deliveryNoteUuid: string) =>
    apiClient.put<{ assignment: PartnerDeliveryNote }>(`${base}/${deliveryNoteUuid}/treat`),

  unmarkTreated: (deliveryNoteUuid: string) =>
    apiClient.put<{ assignment: PartnerDeliveryNote }>(`${base}/${deliveryNoteUuid}/untreat`),

  listMessages(deliveryNoteUuid: string, options?: Options) {
    return apiClient.get<PartnerDeliveryNoteMessage[]>(`${base}/${deliveryNoteUuid}/messages`, {
      signal: options?.signal,
    });
  },

  postMessage(deliveryNoteUuid: string, content: string) {
    return apiClient.post<PartnerDeliveryNoteMessage>(`${base}/${deliveryNoteUuid}/messages`, {
      content,
    });
  },
};
