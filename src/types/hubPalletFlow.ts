/**
 * Types du flux palette du HUB (`hub-app/pallet-flow/*` et `hub-app/orders/pallet-quote*`),
 * alignés sur `front_externe_batipower/lib/api/hub-orders.ts` et `hub-pallet-candidates.ts`.
 */

export type HubPalletFlowStatus = 'CANDIDATE' | 'QUOTE_REQUESTED' | 'ACCEPTED' | 'REFUSED';

export type HubPalletQuoteStatus =
  | 'PENDING'
  | 'ANSWERED'
  | 'ACCEPTED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'EXPIRED'
  | 'CANCELLED';

/** Commande à arbitrer, telle que listée par `GET hub-app/pallet-flow/candidates`. */
export interface HubPalletCandidate {
  reference: string;
  ebatRef: string | null;
  totalPaid: number;
  palletNaturalWarehouse: string | null;
  /** Date d'entrée dans l'arbitrage (ISO). */
  flaggedAt: string;
}

export interface HubPalletCandidatesResponse {
  count: number;
  items: HubPalletCandidate[];
}

/** Devis palette d'une commande (`GET hub-app/orders/pallet-quote/by-order/:ref`). */
export interface HubPalletQuote {
  uuid: string;
  createdAt: string;
  orderReference: string;
  warehouse: string;
  totalWeightGrams: number;
  glsReferencePriceHT: number | null;
  requesterComment?: string | null;
  expiresAt: string;
  sentAt?: string | null;
  status: HubPalletQuoteStatus;
  quotedPriceHT?: number | null;
  leadTimeDays?: number | null;
  responderComment?: string | null;
}

/** Marge d'un entrepôt dans le flux classique (GLS). */
export interface HubWarehouseMargin {
  warehouse: string;
  prixVenteHT: number;
  achatFournisseurHT: number | null;
  carrierCostHT: number;
  margeHT: number | null;
  margePct: number | null;
  unavailableReason?: string | null;
}

export interface HubPalletMarginScenario {
  quotedPriceHT: number;
  status: string;
  margeHT: number;
  margePct: number;
}

/** `GET hub-app/orders/:ref/margin-simulation` (SUPERADMIN). */
export interface HubOrderMarginSimulation {
  reference: string;
  warehouses: Record<string, HubWarehouseMargin>;
  bestWarehouse: string;
  pallet: HubPalletMarginScenario | null;
  palletRecommended: boolean;
  palletReason: string | null;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type HubPalletQuotesResponse = Envelope<HubPalletQuote[]>;
export type HubMarginSimulationResponse = Envelope<HubOrderMarginSimulation | null>;

export interface HubPalletQuoteRequestResponse extends Envelope<HubPalletQuote> {
  /** Une demande est déjà en attente de réponse : aucune nouvelle demande n'a été envoyée. */
  alreadyPending: boolean;
}

export type HubPalletRevertResponse = Envelope<{ reference: string; palletFlowStatus: string }>;
