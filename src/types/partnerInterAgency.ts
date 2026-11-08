/**
 * Inter-agences du module PARTNER (`buyer-app/inter-agency/*`), alignées sur
 * `lib/api/inter-agency-orders.ts` et `inter-agency-messages.ts` du web.
 */

export type InterAgencyField = 'interAgencyDone' | 'interAgencyPreReceived';

export type InterAgencyImpossibleReason =
  | 'NETWORK_OUT_OF_STOCK'
  | 'PRODUCT_DISCONTINUED'
  | 'LEAD_TIME_TOO_LONG'
  | 'AGENCY_REFUSED'
  | 'OTHER';

export const INTER_AGENCY_REASONS: readonly InterAgencyImpossibleReason[] = [
  'NETWORK_OUT_OF_STOCK',
  'PRODUCT_DISCONTINUED',
  'LEAD_TIME_TOO_LONG',
  'AGENCY_REFUSED',
  'OTHER',
];

export const INTER_AGENCY_REASON_LABELS: Record<InterAgencyImpossibleReason, string> = {
  NETWORK_OUT_OF_STOCK: "Rupture sur l'ensemble du réseau d'agences",
  PRODUCT_DISCONTINUED: 'Produit arrêté / fin de série',
  LEAD_TIME_TOO_LONG: 'Délai de transfert incompatible',
  AGENCY_REFUSED: "L'agence refuse de céder son stock",
  OTHER: 'Autre motif',
};

export interface InterAgencyAgencyOption {
  code: string;
  name: string;
  contactName: string | null;
  email: string;
}

export interface InterAgencyAgencyInput {
  code: string;
  internalRef: string;
}

export interface InterAgencyDispatch {
  id: string;
  agencyCode: string;
  agencyName: string;
  internalRef: string | null;
  emailSentAt: string | null;
  emailOpenedAt: string | null;
  processedAt: string | null;
}

export interface InterAgencyOrderRow {
  reference: string;
  quantity: number;
  name: string | null;
}

export interface InterAgencyAgencyStock {
  name: string;
  code: string;
  stock: number;
}

export interface InterAgencyStockSummary {
  productRef: string;
  assignedWarehouseStock: number;
  otherWarehouseTotal: number;
  otherWarehouseAgencies: InterAgencyAgencyStock[];
  qgStock: number;
}

export interface InterAgencyBuyer {
  id: string;
  name: string;
  code: string | null;
}

export interface InterAgencyConversationInfo {
  messageCount: number;
  lastMessageAt: string | null;
  awaitingBuyerReply: boolean;
}

export interface InterAgencyOrder {
  reference: string;
  ebatRef: string | null;
  origin: string | null;
  createdAt: string;
  warehouseAffectation: string | null;
  distributorId?: string | null;
  distributorName?: string | null;
  missingStockRefs: string[];
  stockDetails: InterAgencyStockSummary[];
  rows: InterAgencyOrderRow[];
  buyers: InterAgencyBuyer[];
  interAgencyConfirmed: boolean;
  interAgencyDone: boolean;
  interAgencyDoneAt: string | null;
  interAgencyDoneByName: string | null;
  interAgencyDoneComment: string | null;
  interAgencyDoneDispatches: InterAgencyDispatch[];
  interAgencyPreReceived: boolean;
  interAgencyPreReceivedAt: string | null;
  interAgencyPreReceivedByName: string | null;
  interAgencyImpossible: boolean;
  interAgencyImpossibleAt: string | null;
  interAgencyImpossibleByName: string | null;
  interAgencyImpossibleReason: InterAgencyImpossibleReason | null;
  interAgencyImpossibleComment: string | null;
  hubAckAt: string | null;
  hubAckByName: string | null;
  customerNotifiedAt: string | null;
  customerNotifiedByName: string | null;
  /** Fil avec le HUB (ouvert si l'inter-agence est déclarée impossible). */
  hubConversation: InterAgencyConversationInfo;
  /** Fil avec la logistique (ouvert dès la confirmation logistique). */
  logisticsConversation: InterAgencyConversationInfo;
}

/** Fil de discussion côté acheteur : avec le HUB ou avec la logistique. */
export type InterAgencyChannel = 'hub' | 'logistics';

export type InterAgencyMessageSide = 'HUB' | 'LOGISTICS' | 'BUYER';

export interface InterAgencyMessage {
  id: string;
  authorUserId: string;
  authorName: string;
  authorRole: string | null;
  authorSide: InterAgencyMessageSide;
  content: string;
  createdAt: string;
}
