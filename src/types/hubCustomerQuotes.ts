/**
 * Types du module « Devis clients » du HUB, alignés sur ceux du web
 * (`front_externe_batipower/lib/api/hub-customer-quotes`). Le back renvoie les mêmes formes pour
 * les deux applications.
 */

// ─── Lignes et payload ───────────────────────────────────────────────────────

export type QuoteLineType = 'product' | 'title' | 'text';
export type QuoteGlobalDiscountType = 'PERCENT' | 'AMOUNT';
export type QuotePriceMode = 'proposed' | 'catalog' | 'custom';

/** Client sans compte PrestaShop (prospect). */
export interface QuoteCustomerDraft {
  company?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  address1?: string;
  postcode?: string;
  city?: string;
  country?: string;
}

export interface QuoteLinePayload {
  lineType?: QuoteLineType;
  content?: string;
  note?: string;
  reference: string;
  quantity: number;
  unitPriceHT: number;
  productLabel?: string;
  taxRate?: number;
  prestashopProductId?: number | string;
  imageUrl?: string;
  lineDiscountPercent?: number;
  catalogPriceHT?: number;
  baseCatalogPriceHT?: number;
  effectiveUnitPriceHT?: number;
  priceMode?: string;
  nbColisLine?: number;
  purchasePriceHT?: number;
  proposedPurchasePriceHT?: number;
  ecotaxHT?: number;
  sortOrder?: number;
}

export interface CreateOrUpdateQuotePayload {
  customerPrestashopId?: number | string;
  customerSnapshot?: QuoteCustomerDraft;
  customerDraft?: QuoteCustomerDraft;
  deliveryAddressId?: number;
  invoiceAddressId?: number;
  lines: QuoteLinePayload[];
  internalNotes?: string;
  customerNotes?: string;
  validUntil?: string;
  status?: string;
  shippingFeeHT?: number;
  shippingFeeOffered?: boolean;
  shippingCostHT?: number;
  supplierShippingOffered?: boolean;
  nbColis?: number | null;
  transportConfirmed?: boolean;
  globalDiscountLabel?: string;
  globalDiscountType?: QuoteGlobalDiscountType;
  globalDiscountValue?: number;
  totalWeeeTaxHT?: number;
}

export interface QuotePersistedTotals {
  totalHT?: number;
  totalTTC?: number;
  totalCatalogCostHT?: number;
  totalCostHT?: number;
  totalWeeeTaxHT?: number;
  shippingCostHT?: number;
  totalMarginHT?: number;
  totalMarginPct?: number;
}

// ─── Devis ───────────────────────────────────────────────────────────────────

export type QuoteStatus =
  | 'BROUILLON'
  | 'ENVOYE'
  | 'ACCEPTE'
  | 'CONVERTED'
  | 'ANNULE'
  | 'REFUSE'
  | 'EXPIRE';

export type QuoteFulfillmentMode = 'CLASSIC' | 'WAREHOUSE' | 'QG_DIRECT';
export type QuoteWarehouse = 'FLEVY' | 'DOMBASLE';
export type QuoteFulfillmentWarehouse = QuoteWarehouse;

export interface QuoteSummary {
  id: string;
  status?: string;
  reference?: string;
  createdAt?: string;
  lines?: QuoteLinePayload[];
  customerPrestashopId?: string | number;
  customerLabel?: string;
  customerDraft?: QuoteCustomerDraft;
  totalHT?: number;
  totalTTC?: number;
  shippingFeeHT?: number;
  shippingFeeOffered?: boolean;
  shippingCostHT?: number;
  supplierShippingOffered?: boolean;
  nbColis?: number | null;
  transportConfirmed?: boolean;
  totalCatalogCostHT?: number;
  totalCostHT?: number;
  totalWeeeTaxHT?: number;
  totalMarginHT?: number;
  totalMarginPct?: number;
  globalDiscountLabel?: string;
  globalDiscountType?: QuoteGlobalDiscountType;
  globalDiscountValue?: number;
  internalNotes?: string;
  customerNotes?: string;
  deliveryAddressId?: number;
  invoiceAddressId?: number;
  ebatQuoteId?: string | null;
  ebatQuoteNumber?: string | null;
  ebatQuoteStatus?: string | null;
  ebatQuoteStatusCode?: string | null;
  prestashopOrderId?: number | null;
  prestashopOrderRef?: string | null;
  currentRevision?: number;
  revisionDraftOpen?: boolean;
  revisionsEnforced?: boolean;
  fulfillmentMode?: QuoteFulfillmentMode | null;
  fulfillmentWarehouse?: QuoteWarehouse | null;
  ebatOrderNumber?: string | null;
  ebatOrderError?: string | null;
  aiProposalSnapshot?: QuotePricingProposalResponse | null;
  aiProposalGeneratedAt?: string | null;
}

export interface ListQuotesMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListQuotesResult {
  data: QuoteSummary[];
  meta?: ListQuotesMeta;
}

export interface CancelQuoteResult {
  id: string;
  status: string;
  prestashopOrderCancelled: boolean;
  alreadyCancelled: boolean;
}

// ─── Demandes de devis ───────────────────────────────────────────────────────

export type QuoteRequestStatus = 'NOUVELLE' | 'EN_COURS' | 'TRAITEE' | 'ARCHIVEE' | 'REFUSEE';

export interface QuoteRequestProductLite {
  reference: string;
  quantity: number;
  label?: string;
}

export interface QuoteRequestSummary {
  id: string;
  reference?: string;
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  countryIso?: string;
  message?: string;
  projectReference?: string;
  desiredDelay?: string;
  products: QuoteRequestProductLite[];
  status: QuoteRequestStatus;
  source?: string;
  createdAt: string;
  handledAt?: string;
  refusalReason?: string;
  refusedAt?: string;
  prestashopCustomerId?: number;
  convertedQuote?: { id: string; quoteNumber?: string; status?: string };
}

export interface ListQuoteRequestsResult {
  data: QuoteRequestSummary[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export interface CustomerCheckResult {
  found: boolean;
  prestashopId?: number;
  firstname?: string;
  lastname?: string;
}

// ─── Refus ───────────────────────────────────────────────────────────────────

export type RefusalTargetKind = 'QUOTE' | 'REQUEST';
export type RefusalTone = 'NEUTRE' | 'COMMERCIAL' | 'FERME';

export interface RefusalEmailDraft {
  subject: string;
  body: string;
  aiEnhanced: boolean;
  recipientEmail: string | null;
  warnings: string[];
}

export interface DraftRefusalEmailPayload {
  target: RefusalTargetKind;
  targetId: string;
  reason?: string;
  tone?: RefusalTone;
  currentBody?: string;
  instruction?: string;
}

export interface RefusePayload {
  subject?: string;
  body?: string;
  reason?: string;
  recipientEmail?: string;
  sendEmail?: boolean;
}

export interface RefusalResult {
  id: string;
  status: string;
  emailSent: boolean;
  recipientEmail: string | null;
  alreadyRefused: boolean;
  errorMessage: string | null;
}

// ─── Envoi, commande, adresse ────────────────────────────────────────────────

export type QuoteSendMode = 'devis' | 'virement' | 'paiement' | 'web';
export type QuoteFulfillment = 'classic' | 'warehouse' | 'qg_direct';

export interface QuoteEmailHistoryItem {
  id: string;
  quoteId: string;
  quoteNumber: string;
  mode: QuoteSendMode | 'refus';
  recipientEmail: string | null;
  subject: string | null;
  message: string | null;
  totalTTC: number;
  totalHT: number;
  emailSent: boolean;
  errorMessage: string | null;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  pdfFileName?: string | null;
  createdAt: string;
}

export interface CreatePsOrderResult {
  success: boolean;
  prestashopOrderId?: string | number;
  reference?: string;
  message?: string;
}

export interface QuoteAddress {
  addressId: number | null;
  firstname?: string;
  lastname?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  country?: string;
  phone?: string;
  company?: string;
  alias?: string;
}

export interface UpdateQuoteAddressPayload {
  firstname: string;
  lastname: string;
  address1: string;
  address2?: string;
  postcode: string;
  city: string;
  country: string;
  phone: string;
  company?: string;
  alias?: string;
}

// ─── Révisions ───────────────────────────────────────────────────────────────

export interface QuoteRevisionState {
  currentRevision: number;
  revisionDraftOpen: boolean;
}

// ─── Proposition IA ──────────────────────────────────────────────────────────

export interface MarketplacePriceEntry {
  marketplace: string;
  priceTTC: number | null;
  priceHT: number | null;
  source: 'buybox' | 'equilibre';
  sellerName?: string | null;
}

export interface QuotePricingProposalLine {
  reference: string;
  quantity: number;
  found: boolean;
  designation?: string;
  costHT: number | null;
  costSource?: string;
  supplierMultiplier?: number;
  competitorMinHT: number | null;
  competitorMinSource?: string | null;
  marketplacePrices?: MarketplacePriceEntry[];
  floorPriceHT: number | null;
  targetPriceHT: number | null;
  proposedUnitHT: number | null;
  glsCostHT?: number;
  vatRate: number;
  expectedMarginHT: number | null;
  expectedMarginPercent: number | null;
  rationale: string;
  warehouses?: { source: string; unitHT: number; multiplier?: number; isBest?: boolean }[];
}

export interface QuotePricingProposalResponse {
  lines: QuotePricingProposalLine[];
  subtotalHT: number;
  totalCostHT: number;
  globalMarginHT: number;
  globalMarginPercent: number;
  directSaleMarginPercent: number;
  totalCommissionSavedHT: number;
  suggestedShippingOffered: boolean;
  suggestedShippingFeeHT: number;
  suggestedGlobalDiscountType: QuoteGlobalDiscountType | null;
  suggestedGlobalDiscountValue: number | null;
  suggestedGlobalDiscountLabel: string | null;
  estimatedFinalHT: number;
  rationale: string;
  aiEnhanced: boolean;
  warnings: string[];
}

export interface QuotePricingProposalItem {
  reference: string;
  quantity: number;
  catalogPriceHT?: number;
}

export interface ListQuoteProspectsResult {
  data: QuoteProspectHit[];
  meta?: { total?: number; limit?: number };
}

// ─── PrestaShop (clients, produits) et catalogue ─────────────────────────────

export interface PrestaCustomerHit {
  id: string | number;
  email?: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  phone?: string;
  city?: string;
  postcode?: string;
}

export interface PrestaCustomerAddress {
  id?: string | number;
  alias?: string;
  company?: string;
  firstname?: string;
  lastname?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  phone?: string;
  mobile?: string;
  countryIso?: string;
}

export interface PrestaCustomerDetail extends PrestaCustomerHit {
  addresses?: PrestaCustomerAddress[];
}

export interface ProductResolveResult {
  reference: string;
  label: string;
  unitPriceHT: number;
  basePriceHT?: number;
  taxRate: number;
  prestashopProductId?: number | string;
  imageUrl?: string;
  active?: boolean;
  hasSpecificPrice?: boolean;
}

export interface PrestaProductSearchHit {
  reference: string;
  label: string;
  unitPriceHT?: number;
  basePriceHT?: number;
  taxRate?: number;
  prestashopProductId?: number | string;
  imageUrl?: string;
  active?: boolean;
}

export interface QuoteProspectHit {
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  company?: string | null;
  phone?: string | null;
  address1?: string | null;
  postcode?: string | null;
  city?: string | null;
  country?: string | null;
  prestashopCustomerId?: number | null;
  quoteCount: number;
  lastQuoteId?: string | null;
  lastQuoteReference?: string | null;
  lastStatus?: string | null;
  lastQuoteCreatedAt?: string | null;
  hasQuoteRequest: boolean;
  quoteRequestId?: string | null;
  quoteRequestStatus?: string | null;
  lastActivityAt: string;
}

export interface ApproRowLite {
  reference: string;
  designation?: string | null;
  thumbnailBase64?: string | null;
  fixPriceHT?: number | null;
  purchasePriceFlevyHT?: number | null;
  purchasePriceDombasleHT?: number | null;
  ecotaxFlevyHT?: number | null;
  ecotaxDombasleHT?: number | null;
  supplierQuantityMultiplierFlevy?: number | null;
  supplierQuantityMultiplier?: number | null;
  weightInGrams?: number | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  codeFlevy?: string | null;
  codeDombasle?: string | null;
  nbPieceByColis?: number | null;
}

export interface BatchApproRowsResponse {
  data: Record<string, ApproRowLite | null>;
  found: number;
  notFound: string[];
  total: number;
}

export interface AddProductRawPayload {
  reference: string;
  name: string;
  priceHT: number;
  purchasePriceHT?: number;
  quantity?: number;
  supplierReference?: string;
  warehouse?: 'FLEVY' | 'NANCY' | 'QG_BATIPOWER' | 'DOMBASLE';
}

export interface EnsureApproRowResult {
  status: 'created' | 'exists' | 'bad_request' | 'not_found' | 'error';
  message?: string;
  data?: ApproRowLite & { batipowerId?: number };
  error?: string;
}

export interface AddProductResult {
  success: boolean;
  batipowerId: number | null;
  reference: string | null;
  supplierReference: string | null;
}
