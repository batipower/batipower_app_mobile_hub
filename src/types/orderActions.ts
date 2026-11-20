/**
 * Types des actions de la fiche commande HUB (étiquette, transfert, renvoi, split, annulation,
 * remboursement, documents). Miroir de `front_externe_batipower/lib/api/hub-orders.ts`.
 */

// ─── Étiquette ───────────────────────────────────────────────────────────────

export type HubLabelCarrier = 'GLS' | 'DPD';

export interface HubLabelCarrierOption {
  carrier: HubLabelCarrier;
  label: string;
  /** Faux : transporteur non exploitable (DPD non configuré…), voir `reason`. */
  ready: boolean;
  reason?: string;
}

export interface HubLabelCarrierOptions {
  canChoose: boolean;
  reason?: string;
  /** Transporteur actuel de la commande ; null s'il n'est ni GLS ni DPD Predict. */
  current: HubLabelCarrier | null;
  default: HubLabelCarrier;
  options: HubLabelCarrierOption[];
  hasExistingLabel: boolean;
}

export interface GenerateLabelInput {
  referenceOrder: string;
  nbColis: number;
  /** Poids global saisi au HUB ; omis = poids calculé habituel. */
  weightKg?: number;
  /** Transporteur choisi (marketplace) ; omis = transporteur actuel. */
  carrier?: HubLabelCarrier;
  /** Valeur déclarée (assurance Ad Valorem DPD). */
  insuranceValueEur?: number;
  /** `PDF` : étiquette de secours (SUPERADMIN / MANAGER), jamais envoyée à l'imprimante. */
  printMode?: 'PDF';
}

/** Réponse de `label-pdf` : l'étiquette PDF de secours est générée de façon asynchrone. */
export interface LabelPdfStatus {
  status: 'PENDING' | 'READY' | 'ERROR';
  base64Pdf?: string;
  message?: string;
}

// ─── Renvoi au client ────────────────────────────────────────────────────────

export interface HubOrderResendItem {
  reference: string;
  quantity: number;
}

export interface HubResendOrderBody {
  items?: HubOrderResendItem[];
}

export interface HubResendOrderResult {
  success: boolean;
  message: string;
  newOrderId?: string;
}

// ─── Split / fusion ──────────────────────────────────────────────────────────

export interface HubSplitManualGroup {
  /** Code du catalogue : entrepôt historique ou entrepôt libre (ex. LILLE). */
  warehouse: string;
  lines: HubOrderResendItem[];
}

export interface HubSplitManualBody {
  reference: string;
  /** Vrai : les commandes restent au QG pour un dispatch manuel plus tard. */
  keepOriginalWarehouse?: boolean;
  groups: HubSplitManualGroup[];
}

export interface HubSplitManualResponse {
  success: boolean;
  message: string;
}

export interface HubMergeSplitResponse {
  success: boolean;
  message: string;
}

// ─── Annulation ──────────────────────────────────────────────────────────────

export type HubCancellationReasonCategory =
  | 'MARKETPLACE_CUSTOMER'
  | 'CUSTOMER_REQUEST'
  | 'OUT_OF_STOCK'
  | 'PRICE_ERROR'
  | 'OTHER';

export interface CreateCancellationBody {
  orderReference: string;
  warehouse: string;
  reason: string;
  reasonCategory?: HubCancellationReasonCategory;
  requestedByName: string;
  autoRefund?: boolean;
}

// ─── Documents ───────────────────────────────────────────────────────────────

/** PDF renvoyé en base64 par l'API (facture, avoir). */
export interface HubBase64Document {
  success: boolean;
  message?: string;
  filename?: string;
  base64?: string;
  mimeType?: string;
  invoiceNumber?: string;
}

export interface HubCreditSlip {
  slipId: number;
  slipDate: string;
  totalTTC: string;
  totalHT: string;
}

export interface HubActionResult {
  success: boolean;
  message?: string;
}

// ─── Remboursement ───────────────────────────────────────────────────────────

export type RefundMode = 'total' | 'products' | 'custom';

export interface RefundOrderBody {
  mode: RefundMode;
  products?: HubOrderResendItem[];
  customAmount?: number;
}

export interface RefundOrderResult {
  success: boolean;
  message: string;
  alreadyRefunded?: boolean;
  orderSlipId?: number;
  amount?: number;
  isPartial?: boolean;
}

// ─── Catalogue d'entrepôts ───────────────────────────────────────────────────

export interface WarehouseCatalogEntry {
  code: string;
  label: string;
  shortLabel?: string;
  /** Valeur de l'enum pour un entrepôt historique, null pour un entrepôt libre. */
  legacyEnum: string | null;
  isActive: boolean;
  /** L'entrepôt peut recevoir des commandes (transfert, split). Absent = repli historique. */
  orderAffectationReady?: boolean;
  capabilities?: readonly string[];
}

// ─── Bon de livraison ────────────────────────────────────────────────────────

/** Marque et vignette (base64) d'un article, tirées du catalogue de préparation. */
export interface DeliveryNoteCatalogEntry {
  brand: string | null;
  thumbnailBase64: string | null;
}

/** Note moyenne du site, imprimée sur la page de remerciement du BL. */
export interface SiteRating {
  average: number;
  count: number;
}
