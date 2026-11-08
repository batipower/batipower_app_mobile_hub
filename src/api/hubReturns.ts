import { apiClient } from '@/api/client';

/**
 * Retours de commande du HUB (`hub-app/returns/*`) : historique et poste de réception. Contrat
 * repris de `front_externe_batipower/lib/api/hub-returns.ts`, limité à ce que l'app mobile utilise
 * (historique, fiche, réception, état article / emballage, remarque manager).
 *
 * Les actions répondent 200 avec `success: false` pour un échec métier : l'appelant doit lire
 * `success` et `message`, pas seulement l'absence d'exception.
 */

export type ReturnItemCondition = 'READY_TO_SELL' | 'BROKEN' | 'NOT_RESELLABLE';
export type ReturnBrokenCause = 'BAD_TRANSPORT' | 'TECHNICAL_FAILURE';
/** État de l'emballage (facultatif), distinct de l'état de l'article. */
export type ReturnPackagingCondition =
  | 'INTACT'
  | 'DAMAGED_RESELLABLE'
  | 'DAMAGED_NOT_RESELLABLE'
  | 'OPENED_NOT_RESELLABLE'
  | 'MISSING';

export type ReturnLabelStatus =
  | 'READY_TO_COLLECT'
  | 'COLLECTED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'NEW_PRODUCT_SENT'
  | 'REFUND_PROCESSED';

/** Champs de réception et d'état communs aux étiquettes de retour et aux retours marketplace. */
interface HubReturnReceipt {
  packageReceivedAndVerified: boolean;
  dateVerified: string | null;
  /** Personne qui a notifié la réception (nom, à défaut email) ; `null` = historique ou inconnu. */
  verifiedByName?: string | null;
  verifiedByEmail?: string | null;
  condition: ReturnItemCondition | null;
  brokenCause: ReturnBrokenCause | null;
  packagingCondition: ReturnPackagingCondition | null;
  packagingConditionAt: string | null;
  packagingConditionByName?: string | null;
  packagingConditionByEmail?: string | null;
  conditionAt?: string | null;
  conditionByName?: string | null;
  conditionByEmail?: string | null;
}

export interface HubReturnLabel extends HubReturnReceipt {
  uuid: string;
  createdAt: string;
  updatedAt: string;
  noSuivi: string;
  status: ReturnLabelStatus;
  dateCollected: string | null;
  batchUuid: string | null;
  parcelIndex: number;
  parcelCount: number;
  orderUuid: string;
}

export interface HubReturnMarketplaceReturn extends HubReturnReceipt {
  uuid: string;
  createdAt: string;
  marketplace: string;
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  returnReason: string | null;
  customerComment: string | null;
  orderUuid: string | null;
}

export interface HubReturnOrderRow {
  uuid: string;
  reference: string;
  name: string | null;
  quantity: number;
  productPrice: number;
  weightInGrams: number | null;
}

export interface HubReturnOrder {
  uuid: string;
  reference: string;
  ebatRef: string | null;
  status: string;
  paymentStatus: string | null;
  origin: string | null;
  totalPaid: number | null;
  emailToNotify: string | null;
  createdAt: string;
  dateExpedie: string | null;
  dateDelivery: string | null;
  deliveryAddress: {
    firstname: string | null;
    lastname: string | null;
    address: string | null;
    zipcode: string | null;
    city: string | null;
    phone: string | null;
    mobile: string | null;
  } | null;
  carrier: { name: string } | null;
  rows: HubReturnOrderRow[];
}

/** Remarque destinée aux managers (une par commande), avec la dernière personne l'ayant modifiée. */
export interface HubReturnNote {
  content: string;
  updatedAt: string;
  authorName: string | null;
  authorEmail: string | null;
}

/** Longueur maximale d'une remarque manager (alignée sur le back). */
export const RETURN_NOTE_MAX_LENGTH = 2000;

export interface HubReturnDetail {
  order: HubReturnOrder;
  returnLabels: HubReturnLabel[];
  marketplaceReturns: HubReturnMarketplaceReturn[];
  /** Vignettes (base64) par référence produit. */
  thumbnails: Record<string, string | null>;
  note?: HubReturnNote | null;
}

export interface HubReturnDetailResponse {
  success: boolean;
  message: string;
  data: HubReturnDetail | null;
}

export type ReceiveReturnKind = 'standard' | 'relay-point';

export interface ReceiveReturnBody {
  type: ReceiveReturnKind;
  returnLabelUuid?: string;
  condition?: ReturnItemCondition;
  brokenCause?: ReturnBrokenCause;
  /** Emballage facultatif : ne bloque jamais la réception. */
  packagingCondition?: ReturnPackagingCondition | null;
}

export interface UpdateReturnConditionBody {
  condition: ReturnItemCondition;
  brokenCause?: ReturnBrokenCause;
}

export interface UpdateReturnPackagingBody {
  /** `null` efface l'état (second appui sur la pastille active). */
  packagingCondition: ReturnPackagingCondition | null;
}

export interface ReturnActionResult {
  success: boolean;
  message: string;
}

export interface ReceiveReturnResult extends ReturnActionResult {
  /** Retour point relais déjà enregistré : rien n'a été modifié. */
  alreadyExists?: boolean;
}

export interface UpdateReturnNoteResult extends ReturnActionResult {
  note?: HubReturnNote | null;
}

export type ReturnHistoryType =
  | 'ANY'
  | 'BROKEN'
  | 'TECHNICAL_FAILURE'
  | 'BAD_TRANSPORT'
  | 'BROKEN_OTHER'
  | 'NOT_RESELLABLE'
  | 'READY_TO_SELL'
  | 'UNVERIFIED';

export interface ReturnHistoryParams {
  /** `SITE` ou une marketplace (`AMAZON`, `MANOMANO`, …) ; absent = toutes. */
  source?: string;
  type?: ReturnHistoryType;
  search?: string;
  page: number;
  limit: number;
}

export interface HubReturnHistoryItem {
  id: string;
  /** `SITE` ou clé marketplace. */
  source: string;
  orderReference: string | null;
  customerName: string | null;
  trackingNumber: string | null;
  status: string;
  createdAt: string;
  dateVerified: string | null;
  packageReceivedAndVerified: boolean;
  condition: ReturnItemCondition | null;
  brokenCause: ReturnBrokenCause | null;
  returnType: Exclude<ReturnHistoryType, 'ANY' | 'BROKEN'>;
  packagingCondition: ReturnPackagingCondition | null;
  parcelIndex: number | null;
  parcelCount: number | null;
  returnReason: string | null;
  totalPaid: number | null;
  /** Extrait de la remarque manager de la commande ; `null` si aucune. */
  managerNote?: string | null;
}

export interface ReturnHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReturnHistoryResponse {
  items: HubReturnHistoryItem[];
  pagination: ReturnHistoryPagination;
}

const base = (reference: string) => `hub-app/returns/${encodeURIComponent(reference)}`;

export const hubReturnsApi = {
  /** Historique (site + marketplaces), lecture seule. Le back le réserve au SUPERADMIN et au MANAGER. */
  history(params: ReturnHistoryParams, options?: { signal?: AbortSignal }) {
    return apiClient.get<ReturnHistoryResponse>('hub-app/returns/history', {
      query: {
        source: params.source,
        type: params.type && params.type !== 'ANY' ? params.type : undefined,
        search: params.search,
        page: params.page,
        limit: params.limit,
      },
      signal: options?.signal,
    });
  },

  /** Fiche d'un retour : `term` = référence commande, ou n° de suivi (résolu côté back). */
  findByTerm(term: string, signal?: AbortSignal) {
    return apiClient.get<HubReturnDetailResponse>(base(term), { signal });
  },

  receive(reference: string, body: ReceiveReturnBody) {
    return apiClient.post<ReceiveReturnResult>(`${base(reference)}/receive`, body);
  },

  updateCondition(reference: string, body: UpdateReturnConditionBody) {
    return apiClient.put<ReturnActionResult>(`${base(reference)}/condition`, body);
  },

  updatePackaging(reference: string, body: UpdateReturnPackagingBody) {
    return apiClient.put<ReturnActionResult>(`${base(reference)}/packaging`, body);
  },

  /** Enregistre la remarque manager ; un contenu vide la supprime. */
  updateNote(reference: string, body: { content: string }) {
    return apiClient.put<UpdateReturnNoteResult>(`${base(reference)}/note`, body);
  },

  undoReceive(reference: string) {
    return apiClient.post<ReturnActionResult>(`${base(reference)}/undo-receive`);
  },
};
