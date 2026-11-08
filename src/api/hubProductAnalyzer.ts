import { apiClient } from '@/api/client';
import { toStagingApiQuery } from '@/features/product-analyzer/lib/filters';
import { enrichStagingItem } from '@/features/product-analyzer/lib/helpers';
import type {
  AssignNegotiationBulkBody,
  BulkAssignResult,
  EligibleReferentsResult,
  NegotiationOpportunitySummary,
  PreviewItem,
} from '@/features/product-analyzer/lib/negotiation-api';
import type { LaunchAndDeployResponse } from '@/features/product-analyzer/lib/analyze-types';
import type {
  Affaire,
  AffaireStats,
  AnalyzerWsTicket,
  LaunchResponse,
  ManufacturerSearchResult,
  MarketplaceViabilityResult,
  ReserveListResponse,
  StagingBrandsResponse,
  StagingFilters,
  StagingItem,
  StagingPage,
  NegotiationRequest,
  SupplierCodesSearchResponse,
  Warehouse,
} from '@/types/hubProductAnalyzer';

const BASE = 'hub-app/product-analyzer';

export interface CancelNegotiationsResult {
  cancelled: { stagingUuid: string; opportunityUuid: string }[];
  skipped: { stagingUuid: string; reason: string }[];
}

/** Distributeur actif (sélecteurs HUB) avec son état de paramétrage eBatPro. */
export interface HubDistributor {
  id: string;
  name: string;
  slug: string;
  legacyWarehouse: 'FLEVY' | 'DOMBASLE' | null;
  /** Entrepôt eBatPro (enum) du distributeur ; null = entrepôt libre (pas d'appel eBatPro). */
  ebatproWarehouse: Warehouse | string | null;
  ready: boolean;
  missing: ('WAREHOUSE' | 'EBAT_ACCOUNT')[];
}

export type ReserveTrack = 'STANDARD' | 'DISTRIBUTOR_CLEARANCE' | 'ALL';
export type ReserveTrackPriority = 'CLEARANCE_FIRST' | 'STANDARD_FIRST' | 'MIXED';

export interface ClaimedReserveItem {
  uuid: string;
  ean?: string | null;
  codeEbat?: string | null;
  warehouse?: string | null;
  designation?: string | null;
  affaireId?: string | null;
  affaireName?: string | null;
  priority?: string | null;
  track?: 'STANDARD' | 'DISTRIBUTOR_CLEARANCE';
  distributorId?: string | null;
  distributorName?: string | null;
  uploadUuid?: string | null;
  clearancePriceHT?: number | null;
  normalPriceHT?: number | null;
  clearanceQuantity?: number | null;
  /** Produit déjà au catalogue : analyse forcée en ligne de trace (catalogue inchangé). */
  forceCatalogue?: boolean;
}

export type AnalyzerMatchedOn = 'ean' | 'codeEbat' | 'asin' | 'designation' | 'brand';

/** Suggestion légère renvoyée par `GET staging/search` (navbar HUB). */
export interface AnalyzerSearchHit {
  uuid: string;
  ean: string | null;
  codeEbat: string | null;
  asin: string | null;
  designation: string | null;
  brand: string | null;
  status: string;
  viabilityStatus: string | null;
  createdAt: string;
  matchedOn: AnalyzerMatchedOn;
  exact: boolean;
}

export interface AnalyzerSearchResponse {
  items: AnalyzerSearchHit[];
  count: number;
}

function normalizeStagingPage(data: StagingPage): { items: StagingItem[]; total: number } {
  const raw = (data.items || []) as unknown as Record<string, unknown>[];
  const items = raw.map(enrichStagingItem);
  const total = data.total ?? data.count ?? data.pagination?.total ?? items.length;
  return { items, total };
}

export interface NegotiationScopeContext {
  affaireId?: string;
  distributorId?: string;
}

export interface OtherNegotiationOwner {
  distributorId: string | null;
  name: string;
  status: string;
}

function scopeQuery(ctx: NegotiationScopeContext): Record<string, string> {
  return {
    ...(ctx.affaireId ? { affaireId: ctx.affaireId } : {}),
    ...(ctx.distributorId ? { distributorId: ctx.distributorId } : {}),
  };
}

export const hubProductAnalyzerApi = {
  getWsTicket: () => apiClient.get<AnalyzerWsTicket>(`${BASE}/ws-ticket`),

  searchStaging: (q: string, limit = 6, signal?: AbortSignal) =>
    apiClient.get<AnalyzerSearchResponse>(`${BASE}/staging/search`, {
      query: { q, limit },
      signal,
    }),

  listStaging: async (filters: StagingFilters, options?: { signal?: AbortSignal; page?: number; limit?: number }) => {
    const data = await apiClient.get<StagingPage>(`${BASE}/staging`, {
      query: toStagingApiQuery(filters, { page: options?.page, limit: options?.limit }),
      signal: options?.signal,
    });
    return normalizeStagingPage(data);
  },

  countStaging: async (filters: StagingFilters, extra?: Record<string, string>, signal?: AbortSignal) => {
    const query = { ...toStagingApiQuery(filters, { page: 1, limit: 1 }), ...extra };
    const data = await apiClient.get<StagingPage>(`${BASE}/staging`, { query, signal });
    return data.total ?? data.count ?? data.pagination?.total ?? 0;
  },

  listBrands: (filters: StagingFilters, signal?: AbortSignal) =>
    apiClient.get<StagingBrandsResponse>(`${BASE}/staging/brands`, {
      query: toStagingApiQuery(filters, { forBrandList: true, page: 1, limit: 100 }),
      signal,
    }),

  listTags: (signal?: AbortSignal) => apiClient.get<{ tags: string[] }>(`${BASE}/staging/tags`, { signal }),

  updateTags: (uuid: string, tags: string[]) =>
    apiClient.patch<{ uuid: string; tags: string[] }>(`${BASE}/staging/${uuid}/tags`, { tags }),

  /** Supprime un staging non lancé et non viable / sans information (refusé côté API sinon). */
  deleteStaging: (uuid: string) => apiClient.delete<{ deleted: boolean; uuid: string }>(`${BASE}/staging/${uuid}`),

  getStaging: async (uuid: string, signal?: AbortSignal) =>
    enrichStagingItem(await apiClient.get<Record<string, unknown>>(`${BASE}/staging/${uuid}`, { signal })),

  getStagingByEan: (ean: string) =>
    apiClient.get<{ items: StagingItem[] }>(`${BASE}/staging/by-ean/${encodeURIComponent(ean)}`),

  /** Stagings liés à un produit catalogue (fiche produit HUB). */
  getStagingByReference: async (reference: string) => {
    const data = await apiClient.get<{ items: Record<string, unknown>[]; total?: number }>(
      `${BASE}/staging/by-reference/${encodeURIComponent(reference)}`,
    );
    return (data.items ?? []).map(enrichStagingItem);
  },

  createStagingByEan: (body: { ean: string; estimatedBuyPriceHT?: number; warehouse?: string }) =>
    apiClient.post<StagingItem>(`${BASE}/staging/by-ean`, body),

  getMarketplaceViability: (uuid: string, signal?: AbortSignal) =>
    apiClient.get<MarketplaceViabilityResult>(`${BASE}/staging/${uuid}/marketplace-viability`, { signal }),

  updateStatus: (uuid: string, body: { status: 'VALIDATED' | 'REJECTED'; notes?: string }) =>
    apiClient.patch(`${BASE}/staging/${uuid}/status`, body),

  updateWeight: (uuid: string, weightGrams: number) =>
    apiClient.patch<Record<string, unknown>>(`${BASE}/staging/${uuid}/weight`, { weightGrams }),

  updateBrand: (uuid: string, brand: string) =>
    apiClient.patch<Record<string, unknown>>(`${BASE}/staging/${uuid}/brand`, { brand }),

  updateFragile: (uuid: string, tooFragile: boolean) =>
    apiClient.patch(`${BASE}/staging/${uuid}/too-fragile`, { tooFragile }),

  updateVoluminous: (uuid: string, tooVoluminous: boolean) =>
    apiClient.patch(`${BASE}/staging/${uuid}/too-voluminous`, { tooVoluminous }),

  /** DEP planifié : par entrepôt historique (exclusif Flevy/Dombasle) ou par distributeur (`distributorId` + `planned`). */
  updatePlannedDep: (
    uuid: string,
    plannedDepWarehouse: 'FLEVY' | 'DOMBASLE' | null,
    target?: { distributorId: string; planned: boolean },
  ) =>
    apiClient.patch(
      `${BASE}/staging/${uuid}/planned-dep`,
      target ? { distributorId: target.distributorId, planned: target.planned } : { plannedDepWarehouse },
    ),

  /**
   * Pose (`planned = true`) ou retire (`false`) la DEP planifiée d'UN distributeur, identifié par son id
   * (jamais par son entrepôt : un entrepôt libre comme LILLE n'est pas une valeur de l'enum). N'affecte
   * pas les autres distributeurs ; le serveur garde l'exclusivité historique Flevy / Dombasle.
   */
  setPlannedDep: (uuid: string, distributorId: string, planned: boolean) => {
    // Repli de `useDistributors` (liste non chargée) : ids fictifs, on retombe sur l'entrepôt historique.
    const fallback: Record<string, 'FLEVY' | 'DOMBASLE'> = {
      'fallback-mequisa': 'FLEVY',
      'fallback-aubade': 'DOMBASLE',
    };
    const legacy = fallback[distributorId];
    if (legacy) return hubProductAnalyzerApi.updatePlannedDep(uuid, planned ? legacy : null);
    return hubProductAnalyzerApi.updatePlannedDep(uuid, null, { distributorId, planned });
  },

  attachEan: (uuid: string, body: { ean: string; estimatedBuyPriceHT?: number; forceUpdate?: boolean }) =>
    apiClient.patch(`${BASE}/staging/${uuid}/ean`, body),

  attachEbatCode: (
    uuid: string,
    body: {
      codeEbat: string;
      warehouse?: Warehouse;
      distributorId?: string;
      /** Entrepôt (racine) du distributeur : un code interne par entrepôt. */
      distributorWarehouseId?: string;
      refreshStocks?: boolean;
      forceUpdate?: boolean;
    },
  ) => apiClient.patch<Record<string, unknown>>(`${BASE}/staging/${uuid}/ebat-code`, body),

  removeEbatCode: (uuid: string, distributorId?: string, distributorWarehouseId?: string) =>
    apiClient.delete(
      `${BASE}/staging/${uuid}/ebat-code`,
      distributorId
        ? { query: { distributorId, ...(distributorWarehouseId ? { distributorWarehouseId } : {}) } }
        : undefined,
    ),

  /**
   * Cherche le code interne du produit (par EAN) chez tous les fournisseurs / entrepôts avec un compte eBatPro.
   * Un résultat unique est rattaché ; plusieurs résultats sont renvoyés comme candidats (choix de l'opérateur).
   */
  searchSupplierCodes: (uuid: string, opts: { refreshExisting?: boolean } = {}) =>
    apiClient.post<SupplierCodesSearchResponse>(`${BASE}/staging/${uuid}/supplier-codes/search`, {
      refreshExisting: opts.refreshExisting === true,
    }),

  /** `warehouse` : valeur de l'enum historique ou code d'un entrepôt du catalogue ADMIN (ex. LILLE). */
  setWarehouse: (uuid: string, warehouse: Warehouse | (string & {}), distributorId?: string) =>
    apiClient.patch(`${BASE}/staging/${uuid}/warehouse`, { warehouse, ...(distributorId ? { distributorId } : {}) }),

  launch: (uuid: string) => apiClient.post<LaunchResponse>(`${BASE}/staging/${uuid}/launch`),

  launchFromStaging: (uuid: string, designation?: string) =>
    apiClient.post<LaunchResponse>(`${BASE}/staging/${uuid}/launch-from-staging`, designation ? { designation } : {}),

  launchAndDeploy: (uuid: string, force?: boolean) =>
    apiClient.post<LaunchAndDeployResponse>(
      `${BASE}/staging/${uuid}/launch-and-deploy${force ? '?force=true' : ''}`,
    ),

  refreshEbatpro: (uuid: string) => apiClient.post<Record<string, unknown>>(`${BASE}/staging/${uuid}/refresh-ebatpro`),

  refreshStocks: (uuid: string) => apiClient.post<Record<string, unknown>>(`${BASE}/staging/${uuid}/refresh-stocks`),

  recalculateViabilityTop: (uuid: string) =>
    apiClient.post<Record<string, unknown>>(`${BASE}/staging/${uuid}/recalculate-viability-top`),

  resolveWeight: (uuid: string) => apiClient.post<Record<string, unknown>>(`${BASE}/staging/${uuid}/resolve-weight`),

  attachAffaire: (uuid: string, body: { affaireId: string; warehouse?: Warehouse; distributorId?: string }) =>
    apiClient.post(`${BASE}/staging/${uuid}/affaires`, body),

  listAffaires: (signal?: AbortSignal) =>
    apiClient.get<{ items: Affaire[] }>(`${BASE}/affaires`, {
      query: { status: 'ACTIVE', limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
      signal,
    }),

  createAffaire: (body: { name: string; description?: string; distributorId: string }) =>
    apiClient.post<Affaire>(`${BASE}/affaires`, body),

  deleteAffaire: (affaireId: string) =>
    apiClient.delete<{ deleted: boolean; uuid: string }>(`${BASE}/affaires/${affaireId}`),

  getAffaireStats: (affaireId: string, signal?: AbortSignal) =>
    apiClient.get<AffaireStats>(`${BASE}/affaires/${affaireId}/stats`, { signal }),

  /** Applique une marque unique à TOUS les produits de l'affaire (toutes pages, best-effort). */
  updateAffaireBrand: (affaireId: string, brand: string) =>
    apiClient.patch<{
      affaireId: string;
      brand: string;
      total: number;
      updated: number;
      errors: { stagingId: string; error: string }[];
    }>(`${BASE}/affaires/${affaireId}/brand`, { brand }),

  assignToAffaire: (affaireId: string, body: { stagingUuids: string[]; warehouse?: Warehouse; distributorId?: string }) =>
    apiClient.post(`${BASE}/affaires/${affaireId}/assign`, body),

  searchEbatproByEan: (ean: string, warehouse?: string) =>
    apiClient.get<Record<string, unknown>>(`${BASE}/ebatpro/search-by-ean/${encodeURIComponent(ean)}`, {
      query: warehouse ? { warehouse } : undefined,
    }),

  searchManufacturerRef: (ref: string) =>
    apiClient.get<ManufacturerSearchResult>(`${BASE}/manufacturer-ref/${encodeURIComponent(ref)}`),

  getApproRow: (reference: string) => apiClient.get<Record<string, unknown>>(`${BASE}/appro-row/${encodeURIComponent(reference)}`),

  listReserve: (limit = 1, signal?: AbortSignal) =>
    apiClient.get<ReserveListResponse>(`${BASE}/reserve`, { query: { limit }, signal }),

  addToReserve: (items: { ean?: string; codeEbat?: string; warehouse?: string; designation?: string }[]) =>
    apiClient.post(`${BASE}/reserve`, { items }),

  claimReserve: (body: {
    count: number;
    affaireId?: string;
    priorityOnly?: boolean;
    track?: ReserveTrack;
    distributorId?: string;
    uploadUuid?: string;
    trackPriority?: ReserveTrackPriority;
    mixedClearanceRatio?: number;
    /** Jeton du poste (onglet) : active le heartbeat sur les lignes claimées. */
    claimToken?: string;
  }) => apiClient.post<ClaimedReserveItem[] | { items: ClaimedReserveItem[] }>(`${BASE}/reserve/claim`, body),

  /** Distributeurs actifs + état de paramétrage (sélecteurs distributeur du HUB). */
  listDistributors: (signal?: AbortSignal) => apiClient.get<HubDistributor[]>(`${BASE}/distributors`, { signal }),

  markReserveDone: (uuid: string, stagingUuid: string, claimToken?: string) =>
    apiClient.post(`${BASE}/reserve/mark-done`, { uuid, stagingUuid, ...(claimToken ? { claimToken } : {}) }),

  markReserveFailed: (uuids: string[], claimToken?: string) =>
    apiClient.post(`${BASE}/reserve/mark-failed`, { uuids, ...(claimToken ? { claimToken } : {}) }),

  /** Heartbeat du poste : prolonge ses lignes EN_COURS ; `lost` = lignes de `uuids` reprises par un autre poste. */
  heartbeatReserve: (claimToken: string, uuids?: string[]) =>
    apiClient.post<{ renewed: number; lost: string[] }>(`${BASE}/reserve/heartbeat`, {
      claimToken,
      ...(uuids?.length ? { uuids } : {}),
    }),

  /** Libère les lignes EN_COURS du poste (sortie de l'écran, passage en arrière-plan). */
  releaseReserve: (claimToken: string) =>
    apiClient.post<{ released: number }>(`${BASE}/reserve/release`, { claimToken }),

  /** Reprise de session : ré-adopte les lignes encore libres ou périmées (renvoie les uuid obtenus). */
  reclaimReserve: (claimToken: string, uuids: string[]) =>
    apiClient.post<{ reclaimed: string[] }>(`${BASE}/reserve/reclaim`, { claimToken, uuids }),

  createAmazonOffer: (body: { reference: string; priceTTC?: number }) =>
    apiClient.post(`${BASE}/offers/amazon`, body),

  createAmazonOfferInternational: (body: { reference: string; marketplaces: string[]; priceTTC?: number }) =>
    apiClient.post(`${BASE}/offers/amazon-international`, body),

  createManomanoOffer: (body: { reference: string; priceTTC: number; country?: string }) =>
    apiClient.post(`${BASE}/offers/manomano`, body),

  createLeroyMerlinOffer: (body: { reference: string; priceTTC: number; quantity?: number }) =>
    apiClient.post(`${BASE}/offers/leroymerlin`, body),

  previewNegotiation: async (stagingUuids: string[], signal?: AbortSignal) => {
    const cleaned = Array.from(new Set(stagingUuids.filter(Boolean)));
    if (cleaned.length === 0) return [] as PreviewItem[];
    const CHUNK = 200;
    const out: PreviewItem[] = [];
    for (let i = 0; i < cleaned.length; i += CHUNK) {
      const slice = cleaned.slice(i, i + CHUNK);
      const batch = await apiClient.get<PreviewItem[]>(`${BASE}/negotiation/preview`, {
        query: { stagingUuids: slice.join(',') },
        signal,
      });
      out.push(...(batch ?? []));
    }
    return out;
  },

  eligibleReferents: (warehouse: string, categoryType: string, signal?: AbortSignal) =>
    apiClient.get<EligibleReferentsResult>(`${BASE}/negotiation/eligible-referents`, {
      query: { warehouse, categoryType },
      signal,
    }),

  /**
   * Négos ouvertes par produit. `ctx` cloisonne par fournisseur : celui de l'affaire (`affaireId`)
   * ou le filtre fournisseur (`distributorId`) ; sans contexte, toutes les lignes.
   */
  getOpenOpportunities: async (uuids: string[], ctx: NegotiationScopeContext = {}, signal?: AbortSignal) => {
    const cleaned = Array.from(new Set(uuids.filter(Boolean)));
    if (cleaned.length === 0) return {} as Record<string, NegotiationOpportunitySummary | null>;
    // Les uuids passent en query string : au-delà de ~150 ids l'URL dépasse la limite nginx (HTTP 414).
    const CHUNK = 100;
    const out: Record<string, NegotiationOpportunitySummary | null> = {};
    for (let i = 0; i < cleaned.length; i += CHUNK) {
      const slice = cleaned.slice(i, i + CHUNK);
      const batch = await apiClient.get<Record<string, NegotiationOpportunitySummary | null>>(
        `${BASE}/negotiation/by-staging`,
        { query: { uuids: slice.join(','), ...scopeQuery(ctx) }, signal },
      );
      Object.assign(out, batch);
    }
    return out;
  },

  /** Demandes (négo / DEP) par produit, par entrepôt et fournisseur demandé : tous fournisseurs confondus. */
  getNegotiationRequests: async (uuids: string[], signal?: AbortSignal) => {
    const cleaned = Array.from(new Set(uuids.filter(Boolean)));
    const out: Record<string, NegotiationRequest[]> = {};
    // Les uuids passent en query string : on découpe (cf. getOpenOpportunities).
    const CHUNK = 100;
    for (let i = 0; i < cleaned.length; i += CHUNK) {
      const slice = cleaned.slice(i, i + CHUNK);
      const batch = await apiClient.get<Record<string, NegotiationRequest[]>>(`${BASE}/negotiation/requests-by-staging`, {
        query: { uuids: slice.join(',') },
        signal,
      });
      Object.assign(out, batch);
    }
    return out;
  },

  /** Négos ouvertes chez les AUTRES fournisseurs que celui du contexte (info seule). */
  getOtherNegotiationOwners: async (uuids: string[], ctx: NegotiationScopeContext) => {
    const cleaned = Array.from(new Set(uuids.filter(Boolean)));
    const out: Record<string, OtherNegotiationOwner[]> = {};
    if (cleaned.length === 0 || (!ctx.affaireId && !ctx.distributorId)) return out;
    const CHUNK = 100;
    for (let i = 0; i < cleaned.length; i += CHUNK) {
      const slice = cleaned.slice(i, i + CHUNK);
      const batch = await apiClient.get<Record<string, OtherNegotiationOwner[]>>(`${BASE}/negotiation/other-owners`, {
        query: { uuids: slice.join(','), ...scopeQuery(ctx) },
      });
      Object.assign(out, batch);
    }
    return out;
  },

  assignNegotiationBulk: (body: AssignNegotiationBulkBody) =>
    apiClient.post<BulkAssignResult>(`${BASE}/negotiation/assign/bulk`, body),

  /** Annule les négociations en cours (OPEN / IN_NEGOTIATION) : les lignes disparaissent côté PARTNER. */
  cancelNegotiations: (stagingUuids: string[], reason?: string) =>
    apiClient.post<CancelNegotiationsResult>(`${BASE}/negotiation/cancel/bulk`, {
      stagingUuids: Array.from(new Set(stagingUuids)),
      ...(reason ? { reason } : {}),
    }),

  updateRequestedPrice: (uuid: string, body: { newPriceHT: number; operatorLabel?: string; reason?: string }) =>
    apiClient.patch(`${BASE}/negotiation/${uuid}/requested-price`, body),

  markLaunched: (uuid: string, body: { batipowerId?: number; operatorLabel?: string }) =>
    apiClient.put(`${BASE}/negotiation/${uuid}/mark-launched`, body),
};
