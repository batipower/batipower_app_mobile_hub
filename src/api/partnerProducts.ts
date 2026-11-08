import { apiClient } from '@/api/client';
import type {
  PartnerDepProduct,
  PartnerDepWarehouse,
  PartnerNiveauCriticite,
  PartnerPaginated,
  PartnerProduct,
  PartnerProductDetailResponse,
  PartnerProductFacets,
  PartnerProductMessage,
} from '@/types/partnerProducts';

/**
 * Produits du module PARTNER (`buyer-app/products/*`). Contrat repris de
 * `front_externe_batipower/lib/api/products.ts`, limité à la consultation et aux conversations
 * produit : pas de réappro, de renégociation ni de déclaration de prix d'achat sur mobile.
 */

type Options = { signal?: AbortSignal };

export interface PartnerProductsParams {
  page: number;
  limit: number;
  search?: string;
  brand?: string;
  niveauCriticite?: PartnerNiveauCriticite;
  /** Produits dont le dernier message attend une réponse du compte connecté. */
  awaitingMyReply?: boolean;
}

export interface PartnerDepProductsParams {
  page: number;
  limit: number;
  search?: string;
  brand?: string;
  depWarehouse?: PartnerDepWarehouse;
}

const productPath = (reference: string) => `buyer-app/products/${encodeURIComponent(reference)}`;

export const partnerProductsApi = {
  list(params: PartnerProductsParams, options?: Options) {
    return apiClient.get<PartnerPaginated<PartnerProduct>>('buyer-app/products', {
      query: {
        page: params.page,
        limit: params.limit,
        search: params.search,
        brand: params.brand,
        niveauCriticite: params.niveauCriticite,
        awaitingMyReply: params.awaitingMyReply ? true : undefined,
      },
      signal: options?.signal,
    });
  },

  listDep(params: PartnerDepProductsParams, options?: Options) {
    return apiClient.get<PartnerPaginated<PartnerDepProduct>>('buyer-app/products/dep', {
      query: {
        page: params.page,
        limit: params.limit,
        search: params.search,
        brand: params.brand,
        depWarehouse: params.depWarehouse,
      },
      signal: options?.signal,
    });
  },

  /** Marques disponibles pour les filtres ; `dep` bascule sur le périmètre DEP. */
  facets(params: { dep: boolean; depWarehouse?: PartnerDepWarehouse }, options?: Options) {
    return apiClient.get<PartnerProductFacets>('buyer-app/products/brands', {
      query: {
        dep: params.dep ? 'only' : undefined,
        depWarehouse: params.dep ? params.depWarehouse : undefined,
      },
      signal: options?.signal,
    });
  },

  /** Miniatures des références visibles (chargées après la liste). */
  thumbnails(references: string[], options?: Options) {
    return apiClient.get<Record<string, string | null>>('buyer-app/products/thumbnails', {
      query: { references: references.join(',') },
      signal: options?.signal,
    });
  },

  /** Produits dont le dernier message attend une réponse du compte (badge de l'onglet). */
  pendingMessagesCount(options?: Options) {
    return apiClient.get<{ count: number }>('buyer-app/products/pending-messages-count', {
      signal: options?.signal,
    });
  },

  detail(reference: string, options?: Options) {
    return apiClient.get<PartnerProductDetailResponse>(productPath(reference), {
      signal: options?.signal,
    });
  },

  listMessages(reference: string, options?: Options) {
    return apiClient.get<PartnerProductMessage[]>(`${productPath(reference)}/messages`, {
      signal: options?.signal,
    });
  },

  postMessage(reference: string, content: string) {
    return apiClient.post<PartnerProductMessage>(`${productPath(reference)}/messages`, {
      content,
    });
  },
};
