import { apiClient, UPLOAD_TIMEOUT_MS } from '@/api/client';
import type {
  HubLogisticsDetail,
  HubOrdersByProductResult,
  HubOrderTransportComparison,
  HubSavSearchResult,
} from '@/types/order';
import type {
  CreateCancellationBody,
  DeliveryNoteCatalogEntry,
  GenerateLabelInput,
  HubActionResult,
  HubBase64Document,
  HubCreditSlip,
  HubLabelCarrierOptions,
  HubMergeSplitResponse,
  HubResendOrderBody,
  HubResendOrderResult,
  HubSplitManualBody,
  HubSplitManualResponse,
  LabelPdfStatus,
  SiteRating,
} from '@/types/orderActions';

type SearchOptions = {
  page?: number;
  limit?: number;
  /** Aperçu léger (quelques résultats, sans facettes ni retours enrichis) pour la saisie en direct. */
  preview?: boolean;
  signal?: AbortSignal;
};

/**
 * Commandes du module HUB (`hub-app/orders/*`) : recherche, fiche et actions de la fiche
 * (étiquette, transfert, renvoi, split, annulation…). Ouvertes à tout compte possédant le module
 * HUB (le back le vérifie sur tout le préfixe `/hub-app`) ; les actions réservées au SUPERADMIN
 * ou au MANAGER sont refusées par le back pour les autres rôles. Pendant mobile de
 * `front_externe_batipower/lib/api/hub-orders.ts`.
 */
export const hubOrdersApi = {
  /** Recherche libre : référence, référence eBat, téléphone, n° de suivi, email, nom. */
  searchSav(searchTerm: string, { page = 1, limit = 20, preview, signal }: SearchOptions = {}) {
    return apiClient.get<HubSavSearchResult>('hub-app/orders/search-sav', {
      query: { searchTerm, page, limit, preview: preview ? true : undefined },
      signal,
    });
  },

  /** Commandes qui contiennent une référence produit (référence, ou référence entrepôt). */
  searchByProductReference(
    reference: string,
    { page = 1, limit = 20, preview, signal }: SearchOptions = {},
  ) {
    return apiClient.get<HubOrdersByProductResult>('hub-app/orders/search-by-product-reference', {
      query: {
        reference,
        page,
        limit,
        exactMatch: false,
        preview: preview ? true : undefined,
      },
      signal,
    });
  },

  getLogisticsDetail(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubLogisticsDetail>(
      `hub-app/orders/logistics-detail/${encodeURIComponent(reference)}`,
      { signal },
    );
  },

  /** Coûts transport estimés d'une commande, colis par colis (SUPERADMIN). */
  getTransportComparison(reference: string, signal?: AbortSignal) {
    return apiClient.get<{
      success: boolean;
      message: string;
      data: HubOrderTransportComparison | null;
    }>(`hub-app/orders/${encodeURIComponent(reference)}/transport-comparison`, { signal });
  },

  // ─── Actions de la fiche commande ───────────────────────────────────────────

  /** Transporteurs proposables à l'étiquette (commandes marketplace GLS / DPD Predict). */
  getLabelCarrierOptions(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubLabelCarrierOptions>(
      `hub-app/orders/${encodeURIComponent(reference)}/label-carrier-options`,
      { signal },
    );
  },

  /** Met en file la génération de l'étiquette (thermique, ou PDF de secours avec `printMode`). */
  generateLabel({
    referenceOrder,
    nbColis,
    weightKg,
    carrier,
    insuranceValueEur,
    printMode,
  }: GenerateLabelInput) {
    return apiClient.post<unknown>('hub-app/orders/labels/generate', {
      referenceOrder,
      nbColis,
      logisticsReferences: Array.from({ length: nbColis }, () => ''),
      ...(weightKg != null && { weightKg }),
      ...(carrier && { carrier }),
      ...(insuranceValueEur != null && { insuranceValueEur }),
      ...(printMode && { printMode }),
    });
  },

  /** Statut et PDF de la dernière étiquette PDF de secours demandée (SUPERADMIN / MANAGER). */
  getLabelPdf(reference: string, signal?: AbortSignal) {
    return apiClient.get<LabelPdfStatus>(
      `hub-app/orders/${encodeURIComponent(reference)}/label-pdf`,
      { signal },
    );
  },

  transferWarehouse(reference: string, newWarehouse: string, force?: boolean) {
    return apiClient.put<HubActionResult>(
      'hub-app/orders/transfer-warehouse',
      force ? { reference, newWarehouse, force: true } : { reference, newWarehouse },
    );
  },

  /** « Passer sur eBatPro » : remet l'entrepôt en TODO pour que eBatPro retraite la commande. */
  resendOrder(warehouseOrderUuid: string) {
    return apiClient.put<HubActionResult>('hub-app/orders/warehouse-status', {
      uuid: warehouseOrderUuid,
      status: 'TODO',
    });
  },

  /** Renvoi au client (complet, ou lignes choisies) : crée la commande `-RENVOI`. SUPERADMIN + MANAGER. */
  resendToCustomer(reference: string, body: HubResendOrderBody) {
    return apiClient.post<HubResendOrderResult>(
      `hub-app/orders/${encodeURIComponent(reference)}/resend`,
      body,
    );
  },

  updateTags(reference: string, tags: string[]) {
    return apiClient.put<boolean>(`hub-app/orders/${encodeURIComponent(reference)}/tags`, { tags });
  },

  splitManual(body: HubSplitManualBody) {
    return apiClient.post<HubSplitManualResponse>('hub-app/orders/split-manual', body);
  },

  mergeSplit(parentReference: string) {
    return apiClient.post<HubMergeSplitResponse>('hub-app/orders/merge-split', { parentReference });
  },

  createCancellationRequest(body: CreateCancellationBody) {
    return apiClient.post<{
      id: string;
      status: string;
      autoRefundOutcome?: 'REFUNDED' | 'FAILED' | 'DISABLED' | 'SKIPPED_TRANSFER' | null;
      refundError?: string | null;
    }>('hub-app/orders/cancellation-requests', body);
  },

  /** Retire (rétracte) une demande d'annulation en attente : la commande reste active. */
  cancelCancellationRequest(id: string) {
    return apiClient.patch<unknown>(
      `hub-app/orders/cancellation-requests/${encodeURIComponent(id)}/cancel`,
    );
  },

  /** Force le statut « Livré » (PrestaShop + base) : SUPERADMIN, ex. commandes issues d'un devis. */
  markDelivered(reference: string) {
    return apiClient.post<HubActionResult>(
      `hub-app/orders/${encodeURIComponent(reference)}/mark-delivered`,
    );
  },

  getInvoice(reference: string) {
    return apiClient.get<HubBase64Document>(
      `hub-app/orders/${encodeURIComponent(reference)}/invoice`,
      { timeoutMs: UPLOAD_TIMEOUT_MS },
    );
  },

  /** Avoirs d'une commande : un remboursement partiel peut en créer plusieurs. */
  listCreditSlips(reference: string, signal?: AbortSignal) {
    return apiClient.get<{ success: boolean; message?: string; slips: HubCreditSlip[] }>(
      `hub-app/orders/${encodeURIComponent(reference)}/credit-slips`,
      { signal },
    );
  },

  getCreditSlip(reference: string, slipId: number) {
    return apiClient.get<HubBase64Document>(
      `hub-app/orders/${encodeURIComponent(reference)}/credit-slips/${slipId}`,
      { timeoutMs: UPLOAD_TIMEOUT_MS },
    );
  },

  /** Marques et vignettes des articles d'une commande, pour l'impression du bon de livraison. */
  getPreparationCatalog(references: string[], signal?: AbortSignal) {
    return apiClient.post<{ data: Record<string, DeliveryNoteCatalogEntry | undefined> }>(
      'hub-app/orders/preparation/catalog',
      { references },
      { signal },
    );
  },

  /** Note moyenne du site (page de remerciement du bon de livraison). */
  getSiteRating(signal?: AbortSignal) {
    return apiClient.get<SiteRating | null>('hub-app/reviews/site', { signal });
  },
};
