import { apiClient } from '@/api/client';
import type {
  PartnerOpportunitiesResponse,
  PartnerOpportunityDetail,
  PartnerOpportunityMessage,
  PartnerOpportunityScope,
  PartnerOpportunityStatus,
} from '@/types/partnerOpportunities';

/**
 * Opportunités de négociation du module PARTNER (`buyer-app/negotiation-opportunities/*`). Contrat
 * repris de `front_externe_batipower/lib/api/negotiation-opportunities.ts`, limité à la
 * consultation, au statut lu / traité et à la conversation : pas de proposition de prix sur mobile.
 */

type Options = { signal?: AbortSignal };

export interface PartnerOpportunitiesParams {
  scope: PartnerOpportunityScope;
  status?: PartnerOpportunityStatus;
  brands?: string[];
  /** Recherche par référence, EAN ou désignation. */
  reference?: string;
  /** Opportunités ouvertes non lues (n'a de sens que sur le statut OPEN). */
  unread?: boolean;
  limit: number;
  offset: number;
}

const base = 'buyer-app/negotiation-opportunities';

export const partnerOpportunitiesApi = {
  list(params: PartnerOpportunitiesParams, options?: Options) {
    return apiClient.get<PartnerOpportunitiesResponse>(base, {
      query: {
        scope: params.scope,
        status: params.status,
        brands: params.brands && params.brands.length > 0 ? params.brands.join(',') : undefined,
        reference: params.reference?.trim() || undefined,
        unread: params.unread ? 'true' : undefined,
        sortBy: 'date',
        sortOrder: 'desc',
        limit: params.limit,
        offset: params.offset,
      },
      signal: options?.signal,
    });
  },

  /** Compteurs par statut, pour les puces de la liste. */
  countsByStatus(scope: PartnerOpportunityScope, options?: Options) {
    return apiClient.get<Record<string, number>>(`${base}/counts-by-status`, {
      query: { scope },
      signal: options?.signal,
    });
  },

  listBrands(scope: PartnerOpportunityScope, options?: Options) {
    return apiClient.get<string[]>(`${base}/brands`, { query: { scope }, signal: options?.signal });
  },

  /** Opportunités à traiter (badge de l'onglet). */
  pendingCount(scope: PartnerOpportunityScope, options?: Options) {
    return apiClient.get<{ count: number }>(`${base}/pending-count`, {
      query: { scope },
      signal: options?.signal,
    });
  },

  detail(uuid: string, options?: Options) {
    return apiClient.get<PartnerOpportunityDetail>(`${base}/${uuid}`, { signal: options?.signal });
  },

  markRead: (uuid: string) => apiClient.put<void>(`${base}/${uuid}/read`),
  markUnread: (uuid: string) => apiClient.put<void>(`${base}/${uuid}/unread`),
  markTreated: (uuid: string) => apiClient.put<PartnerOpportunityDetail>(`${base}/${uuid}/treat`),
  unmarkTreated: (uuid: string) =>
    apiClient.put<PartnerOpportunityDetail>(`${base}/${uuid}/untreat`),

  listMessages(uuid: string, options?: Options) {
    return apiClient.get<PartnerOpportunityMessage[]>(`${base}/${uuid}/messages`, {
      signal: options?.signal,
    });
  },

  postMessage(uuid: string, content: string) {
    return apiClient.post<PartnerOpportunityMessage>(`${base}/${uuid}/messages`, {
      content,
      targetUserId: null,
    });
  },
};
