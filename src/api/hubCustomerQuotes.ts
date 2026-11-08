import {
  apiClient,
  LONG_REQUEST_TIMEOUT_MS,
  downloadAuthenticated,
} from '@/api/client';
import type {
  AddProductRawPayload,
  AddProductResult,
  BatchApproRowsResponse,
  CancelQuoteResult,
  CreateOrUpdateQuotePayload,
  CreatePsOrderResult,
  CustomerCheckResult,
  DraftRefusalEmailPayload,
  EnsureApproRowResult,
  ListQuoteProspectsResult,
  ListQuotesMeta,
  ListQuotesResult,
  PrestaCustomerDetail,
  PrestaCustomerHit,
  PrestaProductSearchHit,
  ProductResolveResult,
  QuoteAddress,
  QuoteCustomerDraft,
  QuoteEmailHistoryItem,
  QuoteFulfillment,
  QuoteFulfillmentWarehouse,
  QuoteLinePayload,
  QuotePersistedTotals,
  QuotePricingProposalItem,
  QuotePricingProposalResponse,
  QuoteRequestProductLite,
  QuoteRequestStatus,
  QuoteRequestSummary,
  QuoteRevisionState,
  QuoteSendMode,
  QuoteSummary,
  RefusalEmailDraft,
  RefusalResult,
  RefusePayload,
  UpdateQuoteAddressPayload,
} from '@/types/hubCustomerQuotes';

/**
 * Client API « Devis clients » du HUB (`hub-app/customer-quotes/*`), porté depuis
 * `front_externe_batipower/lib/api/hub-customer-quotes` : même parsing défensif, mêmes routes.
 * Le back réserve ces routes au SUPERADMIN (`canAccessHubCustomerQuotes`).
 */
const BASE = 'hub-app/customer-quotes';

// ─── Normalisation ───────────────────────────────────────────────────────────

function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: unknown }).data !== undefined) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v.replace(',', '.'));
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return undefined;
}

function pickProductImageUrl(o: Record<string, unknown>): string | undefined {
  return pickString(o, [
    'thumbnailBase64',
    'thumbnail_base64',
    'imageUrl',
    'image_url',
    'thumbnailUrl',
    'thumbnail_url',
    'image_default',
    'coverImageUrl',
    'cover_url',
    'picture',
    'image',
  ]);
}

function normalizeQuoteId(raw: Record<string, unknown>): string {
  const id = raw.id ?? raw.uuid ?? raw._id;
  return String(id ?? '');
}

function parseCustomerDraftFromRecord(data: Record<string, unknown>): QuoteCustomerDraft | undefined {
  const raw =
    data.customerSnapshot ?? data.customerDraft ?? data.guestCustomer ?? data.prospectCustomer ?? data.customerProspect;
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const email = pickString(o, ['email']);
  const firstname = pickString(o, ['firstname', 'firstName', 'first_name']);
  if (!email && !firstname && !pickString(o, ['company', 'lastname', 'lastName'])) return undefined;
  return {
    company: pickString(o, ['company', 'societe']),
    firstname,
    lastname: pickString(o, ['lastname', 'lastName', 'last_name']),
    email,
    phone: pickString(o, ['phone', 'phone_mobile']),
    address1: pickString(o, ['address1', 'address']),
    postcode: pickString(o, ['postcode', 'zipcode']),
    city: pickString(o, ['city']),
    country: pickString(o, ['country', 'country_iso', 'countryIso']) ?? 'FR',
  };
}

function formatDraftLabel(d: QuoteCustomerDraft | undefined): string | undefined {
  if (!d) return undefined;
  const name = [d.firstname, d.lastname].filter(Boolean).join(' ').trim();
  const core = d.company?.trim() || name || d.email;
  return core ? (d.email && core !== d.email ? `${core} · ${d.email}` : core) : d.email;
}

function parsePrestaCustomerHit(row: unknown): PrestaCustomerHit {
  const o = (row as Record<string, unknown>) || {};
  const rawId = o.id ?? o.id_customer ?? o.customerId ?? '';
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : String(rawId);
  return {
    id,
    email: pickString(o, ['email']),
    firstname: pickString(o, ['firstname', 'firstName', 'first_name']),
    lastname: pickString(o, ['lastname', 'lastName', 'last_name']),
    company: pickString(o, ['company', 'societe']),
    phone: pickString(o, ['phone', 'phone_mobile']),
    city: pickString(o, ['city']),
    postcode: pickString(o, ['postcode', 'zipcode']),
  };
}

function normalizeQuoteSummaryRow(row: unknown): QuoteSummary {
  const o = row as Record<string, unknown>;
  const cid = o.customerPrestashopId ?? o.customerId ?? o.id_customer;
  const customerPrestashopId = typeof cid === 'string' || typeof cid === 'number' ? cid : undefined;
  const customerDraft = parseCustomerDraftFromRecord(o);
  const customerLabel = pickString(o, ['customerLabel', 'customerName', 'clientName', 'customer_display']) ?? formatDraftLabel(customerDraft);

  const linesRaw = Array.isArray(o.lines) ? (o.lines as Record<string, unknown>[]) : undefined;
  const lines: QuoteLinePayload[] | undefined = linesRaw
    ? linesRaw.map((L) => {
        const rawType = pickString(L, ['lineType', 'line_type']);
        const lineType: 'product' | 'title' | 'text' = rawType === 'title' || rawType === 'text' ? rawType : 'product';
        return {
          lineType,
          reference: pickString(L, ['reference', 'productReference']) ?? '',
          quantity: pickNumber(L, ['quantity', 'qty']) ?? 0,
          unitPriceHT: pickNumber(L, ['unitPriceHT', 'unit_price_ht', 'priceHT', 'price']) ?? 0,
          purchasePriceHT: pickNumber(L, ['purchasePriceHT', 'purchase_price_ht']) ?? undefined,
          proposedPurchasePriceHT: pickNumber(L, ['proposedPurchasePriceHT', 'proposed_purchase_price_ht']) ?? undefined,
          ecotaxHT: pickNumber(L, ['ecotaxHT', 'ecotax_ht']) ?? undefined,
        };
      })
    : undefined;

  const shippingFeeOfferedRaw = o.shippingFeeOffered ?? o.shipping_fee_offered;
  const shippingFeeOffered = shippingFeeOfferedRaw === true || shippingFeeOfferedRaw === 'true' ? true : shippingFeeOfferedRaw === false || shippingFeeOfferedRaw === 'false' ? false : undefined;

  const supplierShippingOfferedRaw = o.supplierShippingOffered ?? o.supplier_shipping_offered;
  const supplierShippingOffered =
    supplierShippingOfferedRaw === true || supplierShippingOfferedRaw === 'true' ? true : supplierShippingOfferedRaw === false || supplierShippingOfferedRaw === 'false' ? false : undefined;

  const gdt = pickString(o, ['globalDiscountType', 'global_discount_type']);

  return {
    id: normalizeQuoteId(o),
    status: pickString(o, ['status']),
    reference: pickString(o, ['reference', 'quoteReference', 'quoteNumber']),
    createdAt: pickString(o, ['createdAt', 'created_at']),
    customerPrestashopId,
    customerLabel,
    customerDraft,
    lines,
    totalHT: pickNumber(o, ['totalHT', 'total_ht', 'totalProductHT']),
    totalTTC: pickNumber(o, ['totalTTC', 'total_ttc']),
    shippingFeeHT: pickNumber(o, ['shippingFeeHT', 'shipping_fee_ht']),
    shippingFeeOffered,
    shippingCostHT: pickNumber(o, ['shippingCostHT', 'shipping_cost_ht']),
    supplierShippingOffered,
    transportConfirmed: (() => {
      const raw = o.transportConfirmed ?? o.transport_confirmed;
      if (raw === true || raw === 'true') return true;
      if (raw === false || raw === 'false') return false;
      return undefined;
    })(),
    totalCatalogCostHT: pickNumber(o, ['totalCatalogCostHT', 'total_catalog_cost_ht']),
    totalCostHT: pickNumber(o, ['totalCostHT', 'total_cost_ht']),
    totalWeeeTaxHT: pickNumber(o, ['totalWeeeTaxHT', 'total_weee_tax_ht']),
    totalMarginHT: pickNumber(o, ['totalMarginHT', 'total_margin_ht']),
    totalMarginPct: pickNumber(o, ['totalMarginPct', 'total_margin_pct']),
    globalDiscountLabel: pickString(o, ['globalDiscountLabel', 'global_discount_label']),
    globalDiscountType: gdt === 'PERCENT' || gdt === 'AMOUNT' ? gdt : undefined,
    globalDiscountValue: pickNumber(o, ['globalDiscountValue', 'global_discount_value']),
    ebatQuoteId: pickString(o, ['ebatQuoteId', 'ebat_quote_id']) ?? null,
    ebatQuoteNumber: pickString(o, ['ebatQuoteNumber', 'ebat_quote_number']) ?? null,
    ebatQuoteStatus: pickString(o, ['ebatQuoteStatus', 'ebat_quote_status']) ?? null,
    ebatQuoteStatusCode: pickString(o, ['ebatQuoteStatusCode', 'ebat_quote_status_code']) ?? null,
    prestashopOrderId: pickNumber(o, ['prestashopOrderId', 'prestashop_order_id']) ?? null,
    prestashopOrderRef: pickString(o, ['prestashopOrderRef', 'prestashop_order_ref']) ?? null,
    currentRevision: pickNumber(o, ['currentRevision']) ?? 0,
    revisionDraftOpen: o.revisionDraftOpen === true,
  };
}

export async function listQuotes(params?: {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: number | string;
  search?: string;
}): Promise<ListQuotesResult> {
  const parsedCustomerId =
    params?.customerId != null ? (typeof params.customerId === 'number' ? params.customerId : parseInt(String(params.customerId), 10)) : undefined;
  const customerId = Number.isFinite(parsedCustomerId) && parsedCustomerId! > 0 ? parsedCustomerId : undefined;
  const search = params?.search?.trim() || undefined;
  const raw = await apiClient.get<{ data?: unknown; meta?: Record<string, unknown>; items?: unknown[]; quotes?: unknown[] } | unknown[]>(`${BASE}/quotes`, {
    query: { page: params?.page ?? 1, limit: params?.limit ?? 50, status: params?.status, customerId, search },
  });

  let list: unknown[] = [];
  let meta: ListQuotesMeta | undefined;
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.items)) list = raw.items;
    else if (Array.isArray(raw.quotes)) list = raw.quotes;
    if (raw.meta && typeof raw.meta === 'object') {
      const m = raw.meta as Record<string, unknown>;
      const page = pickNumber(m, ['page']) ?? params?.page ?? 1;
      const limit = pickNumber(m, ['limit']) ?? params?.limit ?? 50;
      const total = pickNumber(m, ['total']) ?? list.length;
      const totalPages = pickNumber(m, ['totalPages', 'total_pages']) ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
      meta = { page, limit, total, totalPages };
    }
  }

  return { data: list.map(normalizeQuoteSummaryRow), meta };
}

export async function getQuote(id: string): Promise<QuoteSummary & { lines: QuoteLinePayload[] }> {
  const data = unwrapData<Record<string, unknown>>(await apiClient.get(`${BASE}/quotes/${encodeURIComponent(id)}`));
  const linesRaw = data.lines ?? data.rows ?? [];
  const lines: QuoteLinePayload[] = Array.isArray(linesRaw)
    ? (linesRaw as Record<string, unknown>[]).map((L) => {
        const pRaw = L.prestashopProductId ?? L.id_product;
        const prestashopProductId = typeof pRaw === 'string' || typeof pRaw === 'number' ? pRaw : undefined;
        const rawLineType = pickString(L, ['lineType', 'line_type']);
        const lineType: 'product' | 'title' | 'text' = rawLineType === 'title' || rawLineType === 'text' ? rawLineType : 'product';
        return {
          lineType,
          content: pickString(L, ['content']) ?? undefined,
          note: pickString(L, ['note']) ?? undefined,
          reference: pickString(L, ['reference', 'productReference']) ?? '',
          quantity: pickNumber(L, ['quantity', 'qty']) ?? 1,
          unitPriceHT: pickNumber(L, ['unitPriceHT', 'unit_price_ht', 'priceHT', 'price']) ?? 0,
          productLabel: pickString(L, ['productLabel', 'label', 'name']),
          taxRate: pickNumber(L, ['taxRate', 'tax_rate']) ?? 0.2,
          prestashopProductId,
          imageUrl: pickProductImageUrl(L),
          lineDiscountPercent: pickNumber(L, ['lineDiscountPercent', 'line_discount_percent', 'discountPercent']),
          catalogPriceHT: pickNumber(L, ['catalogPriceHT', 'catalog_price_ht']) ?? undefined,
          baseCatalogPriceHT: pickNumber(L, ['baseCatalogPriceHT', 'base_catalog_price_ht']) ?? undefined,
          effectiveUnitPriceHT: pickNumber(L, ['effectiveUnitPriceHT', 'effective_unit_price_ht']) ?? undefined,
          priceMode: pickString(L, ['priceMode', 'price_mode']) ?? undefined,
          purchasePriceHT: pickNumber(L, ['purchasePriceHT', 'purchase_price_ht']) ?? undefined,
          proposedPurchasePriceHT: pickNumber(L, ['proposedPurchasePriceHT', 'proposed_purchase_price_ht']) ?? undefined,
          ecotaxHT: pickNumber(L, ['ecotaxHT', 'ecotax_ht']) ?? undefined,
          nbColisLine: pickNumber(L, ['nbColisLine', 'nb_colis_line']) ?? undefined,
        };
      })
    : [];
  const custRaw = data.customerPrestashopId ?? data.customerId ?? data.id_customer;
  const customerPrestashopId = typeof custRaw === 'string' || typeof custRaw === 'number' ? custRaw : undefined;
  const customerDraft = parseCustomerDraftFromRecord(data);
  const customerLabel = pickString(data, ['customerLabel', 'customerName', 'clientName']) ?? formatDraftLabel(customerDraft);
  const gdt = pickString(data, ['globalDiscountType']);
  return {
    id: normalizeQuoteId(data),
    status: pickString(data, ['status']),
    reference: pickString(data, ['reference', 'quoteNumber']),
    createdAt: pickString(data, ['createdAt', 'created_at']),
    customerPrestashopId,
    customerDraft,
    customerLabel,
    lines,
    totalHT: pickNumber(data, ['totalHT', 'total_ht', 'totalProductHT']),
    totalTTC: pickNumber(data, ['totalTTC', 'total_ttc']),
    shippingFeeHT: pickNumber(data, ['shippingFeeHT', 'shipping_fee_ht']),
    shippingFeeOffered:
      data.shippingFeeOffered === true || data.shippingFeeOffered === 'true' ? true : data.shippingFeeOffered === false || data.shippingFeeOffered === 'false' ? false : undefined,
    shippingCostHT: pickNumber(data, ['shippingCostHT', 'shipping_cost_ht']),
    supplierShippingOffered:
      data.supplierShippingOffered === true || data.supplierShippingOffered === 'true'
        ? true
        : data.supplierShippingOffered === false || data.supplierShippingOffered === 'false'
          ? false
          : undefined,
    nbColis: pickNumber(data, ['nbColis', 'nb_colis']) ?? null,
    transportConfirmed: (() => {
      const raw = data.transportConfirmed ?? data.transport_confirmed;
      if (raw === true || raw === 'true') return true;
      if (raw === false || raw === 'false') return false;
      return undefined;
    })(),
    totalCatalogCostHT: pickNumber(data, ['totalCatalogCostHT', 'total_catalog_cost_ht']),
    totalCostHT: pickNumber(data, ['totalCostHT', 'total_cost_ht']),
    totalWeeeTaxHT: pickNumber(data, ['totalWeeeTaxHT', 'total_weee_tax_ht']),
    totalMarginHT: pickNumber(data, ['totalMarginHT', 'total_margin_ht']),
    totalMarginPct: pickNumber(data, ['totalMarginPct', 'total_margin_pct']),
    globalDiscountLabel: pickString(data, ['globalDiscountLabel', 'global_discount_label']),
    globalDiscountType: gdt === 'PERCENT' || gdt === 'AMOUNT' ? gdt : undefined,
    globalDiscountValue: pickNumber(data, ['globalDiscountValue', 'global_discount_value']),
    internalNotes: pickString(data, ['internalNotes', 'internal_notes']),
    customerNotes: pickString(data, ['customerNotes', 'customer_notes']),
    deliveryAddressId: pickNumber(data, ['deliveryAddressId', 'delivery_address_id']) ?? undefined,
    invoiceAddressId: pickNumber(data, ['invoiceAddressId', 'invoice_address_id']) ?? undefined,
    ebatQuoteId: pickString(data, ['ebatQuoteId', 'ebat_quote_id']) ?? null,
    ebatQuoteNumber: pickString(data, ['ebatQuoteNumber', 'ebat_quote_number']) ?? null,
    ebatQuoteStatus: pickString(data, ['ebatQuoteStatus', 'ebat_quote_status']) ?? null,
    ebatQuoteStatusCode: pickString(data, ['ebatQuoteStatusCode', 'ebat_quote_status_code']) ?? null,
    prestashopOrderId: pickNumber(data, ['prestashopOrderId', 'prestashop_order_id']) ?? null,
    prestashopOrderRef: pickString(data, ['prestashopOrderRef', 'prestashop_order_ref']) ?? null,
    currentRevision: pickNumber(data, ['currentRevision']) ?? 0,
    revisionDraftOpen: data.revisionDraftOpen === true,
    revisionsEnforced: data.revisionsEnforced === true,
    fulfillmentMode: ((): 'CLASSIC' | 'WAREHOUSE' | 'QG_DIRECT' | null => {
      const m = pickString(data, ['fulfillmentMode', 'fulfillment_mode']);
      return m === 'CLASSIC' || m === 'WAREHOUSE' || m === 'QG_DIRECT' ? m : null;
    })(),
    fulfillmentWarehouse: ((): 'FLEVY' | 'DOMBASLE' | null => {
      const w = pickString(data, ['fulfillmentWarehouse', 'fulfillment_warehouse']);
      return w === 'FLEVY' || w === 'DOMBASLE' ? w : null;
    })(),
    ebatOrderNumber: pickString(data, ['ebatOrderNumber', 'ebat_order_number']) ?? null,
    ebatOrderError: pickString(data, ['ebatOrderError', 'ebat_order_error']) ?? null,
    aiProposalSnapshot: data.aiProposalSnapshot && typeof data.aiProposalSnapshot === 'object' ? (data.aiProposalSnapshot as QuotePricingProposalResponse) : null,
    aiProposalGeneratedAt: pickString(data, ['aiProposalGeneratedAt', 'ai_proposal_generated_at']) ?? null,
  };
}

// ─── Demandes ───────────────────────────────────────────────────────────────

function normalizeQuoteRequest(row: Record<string, unknown>): QuoteRequestSummary {
  const productsRaw = row.products;
  const products: QuoteRequestProductLite[] = Array.isArray(productsRaw)
    ? (productsRaw as Record<string, unknown>[]).map((p) => ({
        reference: pickString(p, ['reference', 'ref']) ?? '',
        quantity: pickNumber(p, ['quantity', 'qty']) ?? 1,
        label: pickString(p, ['label', 'name']),
      }))
    : [];
  const cqRaw = row.convertedQuote as Record<string, unknown> | undefined;
  const metaRaw = row.metadata as Record<string, unknown> | null | undefined;
  return {
    id: String(row.id ?? ''),
    reference: pickString(row, ['reference']),
    email: String(row.email ?? ''),
    name: pickString(row, ['name']),
    phone: pickString(row, ['phone']),
    company: pickString(row, ['company']),
    address1: pickString(row, ['address1']),
    address2: pickString(row, ['address2']),
    postcode: pickString(row, ['postcode']),
    city: pickString(row, ['city']),
    countryIso: pickString(row, ['countryIso', 'country_iso']),
    message: pickString(row, ['message']),
    projectReference: metaRaw ? pickString(metaRaw, ['projectReference']) : undefined,
    desiredDelay: metaRaw ? pickString(metaRaw, ['desiredDelay']) : undefined,
    products,
    status: (pickString(row, ['status']) || 'NOUVELLE') as QuoteRequestStatus,
    source: pickString(row, ['source']),
    createdAt: pickString(row, ['createdAt', 'created_at']) ?? '',
    handledAt: pickString(row, ['handledAt', 'handled_at']),
    refusalReason: pickString(row, ['refusalReason']),
    refusedAt: pickString(row, ['refusedAt']),
    prestashopCustomerId: pickNumber(row, ['prestashopCustomerId', 'prestashop_customer_id']),
    convertedQuote: cqRaw
      ? { id: String(cqRaw.id ?? ''), quoteNumber: pickString(cqRaw, ['quoteNumber']), status: pickString(cqRaw, ['status']) }
      : undefined,
  };
}

export async function listQuoteRequests(params?: {
  page?: number;
  limit?: number;
  status?: QuoteRequestStatus;
  search?: string;
}): Promise<{ data: QuoteRequestSummary[]; meta?: Record<string, unknown> }> {
  const raw = await apiClient.get<{ data?: unknown; meta?: Record<string, unknown> } | unknown[]>(`${BASE}/requests`, {
    query: { page: params?.page ?? 1, limit: params?.limit ?? 50, status: params?.status, search: params?.search },
  });
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: unknown[] }).data : [];
  return {
    data: (list as Record<string, unknown>[]).map(normalizeQuoteRequest),
    meta: Array.isArray(raw) ? undefined : (raw as { meta?: Record<string, unknown> })?.meta,
  };
}

export async function getQuoteRequest(id: string): Promise<QuoteRequestSummary> {
  const raw = unwrapData<Record<string, unknown>>(
    await apiClient.get(`${BASE}/requests/${encodeURIComponent(id)}`),
  );
  return normalizeQuoteRequest(raw);
}

export async function getQuoteRequestCounts(): Promise<{ pending: number }> {
  const data = unwrapData<Record<string, unknown>>(await apiClient.get(`${BASE}/requests/counts`));
  return { pending: pickNumber(data, ['pending']) ?? 0 };
}

export async function updateQuoteRequestStatus(id: string, status: QuoteRequestStatus): Promise<void> {
  await apiClient.patch(`${BASE}/requests/${encodeURIComponent(id)}`, { status });
}

export async function updateQuoteRequestContact(
  id: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    address1?: string;
    address2?: string;
    postcode?: string;
    city?: string;
    countryIso?: string;
  },
): Promise<QuoteRequestSummary> {
  const raw = unwrapData<Record<string, unknown>>(
    await apiClient.patch(`${BASE}/requests/${encodeURIComponent(id)}`, payload),
  );
  return normalizeQuoteRequest(raw);
}

export async function convertQuoteRequestToQuote(id: string): Promise<{ id: string }> {
  const data = unwrapData<Record<string, unknown>>(await apiClient.post(`${BASE}/requests/${encodeURIComponent(id)}/convert-to-quote`));
  return { id: String(data.id ?? data.uuid ?? '') };
}

export async function createDevisCustomer(
  quoteRequestId: string,
): Promise<{ prestashopId: number; email: string; firstname: string; lastname: string; addressId?: number | null }> {
  return unwrapData(await apiClient.post(`${BASE}/requests/${encodeURIComponent(quoteRequestId)}/create-devis-customer`));
}

export async function checkQuoteRequestCustomers(emails: string[]): Promise<Record<string, CustomerCheckResult>> {
  return unwrapData(await apiClient.post(`${BASE}/requests/check-customers`, { emails }));
}

/**
 * Refuse une demande de devis : envoie l'email d'explication au demandeur puis
 * passe la demande au statut REFUSEE (elle sort du segment Demandes).
 */
export async function refuseQuoteRequest(id: string, payload: RefusePayload): Promise<RefusalResult> {
  return unwrapData<RefusalResult>(await apiClient.post(`${BASE}/requests/${encodeURIComponent(id)}/refuse`, payload));
}

// ─── Devis : cycle de vie ───────────────────────────────────────────────────

export async function createQuote(payload: CreateOrUpdateQuotePayload): Promise<{ id: string; reference?: string }> {
  const data = unwrapData<Record<string, unknown>>(await apiClient.post(`${BASE}/quotes`, payload));
  return {
    id: normalizeQuoteId(data),
    reference: pickString(data, ['reference', 'quoteReference', 'quoteNumber']) ?? undefined,
  };
}

export async function updateQuote(id: string, payload: CreateOrUpdateQuotePayload): Promise<QuotePersistedTotals> {
  const data = unwrapData<Record<string, unknown>>(await apiClient.patch(`${BASE}/quotes/${encodeURIComponent(id)}`, payload));
  return {
    totalHT: pickNumber(data, ['totalHT', 'total_ht', 'totalProductHT']),
    totalTTC: pickNumber(data, ['totalTTC', 'total_ttc']),
    totalCatalogCostHT: pickNumber(data, ['totalCatalogCostHT', 'total_catalog_cost_ht']),
    totalCostHT: pickNumber(data, ['totalCostHT', 'total_cost_ht']),
    totalWeeeTaxHT: pickNumber(data, ['totalWeeeTaxHT', 'total_weee_tax_ht']),
    shippingCostHT: pickNumber(data, ['shippingCostHT', 'shipping_cost_ht']),
    totalMarginHT: pickNumber(data, ['totalMarginHT', 'total_margin_ht']),
    totalMarginPct: pickNumber(data, ['totalMarginPct', 'total_margin_pct']),
  };
}

/** PDF du devis généré par le back (même rendu que le web), téléchargé dans le cache de l'app. */
export function downloadQuotePdf(quoteId: string, reference?: string | null) {
  const safe = (reference || quoteId).replace(/[/\\?%*:|"<>]/g, '-');
  return downloadAuthenticated(`${BASE}/quotes/${encodeURIComponent(quoteId)}/pdf`, `devis-${safe}.pdf`);
}

export async function archiveQuote(id: string): Promise<void> {
  await apiClient.post(`${BASE}/quotes/${encodeURIComponent(id)}/archive`);
}

export async function cancelQuote(id: string, opts?: { cancelPrestashopOrder?: boolean; reason?: string }): Promise<CancelQuoteResult> {
  return apiClient.post<CancelQuoteResult>(`${BASE}/quotes/${encodeURIComponent(id)}/cancel`, {
    cancelPrestashopOrder: opts?.cancelPrestashopOrder ?? false,
    reason: opts?.reason ?? undefined,
  });
}

/* ─── Refus commercial ─────────────────────────────────────────────── */

export async function draftRefusalEmail(payload: DraftRefusalEmailPayload): Promise<RefusalEmailDraft> {
  return unwrapData<RefusalEmailDraft>(
    await apiClient.post(`${BASE}/refusal/draft`, payload, { timeoutMs: LONG_REQUEST_TIMEOUT_MS }),
  );
}

export async function refuseQuote(id: string, payload: RefusePayload): Promise<RefusalResult> {
  return unwrapData<RefusalResult>(await apiClient.post(`${BASE}/quotes/${encodeURIComponent(id)}/refuse`, payload));
}

/* ─── Envoi au client / relance paiement / historique ─────────────── */

export async function sendQuote(quoteId: string, message?: string, pdfBase64?: string, mode: QuoteSendMode = 'devis', notifyCustomer: boolean = true): Promise<void> {
  await apiClient.post(`${BASE}/quotes/${encodeURIComponent(quoteId)}/send`, {
    message: message?.trim() || undefined,
    pdfBase64: pdfBase64 || undefined,
    mode,
    // Uniquement pertinent pour le mode « web » (espace client) : false => aucun email.
    ...(mode === 'web' && !notifyCustomer ? { notifyCustomer: false } : {}),
  });
}

/**
 * Renvoie un lien de règlement PayPlug pour un devis déjà envoyé en mode
 * paiement. Refuse côté back si une commande PrestaShop est déjà liée.
 */
export async function resendPaymentLink(quoteId: string, message?: string): Promise<void> {
  await apiClient.post(`${BASE}/quotes/${encodeURIComponent(quoteId)}/resend-payment-link`, {
    message: message?.trim() || undefined,
  });
}

function normalizeEmailHistoryItem(row: Record<string, unknown>): QuoteEmailHistoryItem {
  const mode = String(row.mode ?? 'devis');
  return {
    id: String(row.id ?? ''),
    quoteId: String(row.quoteId ?? ''),
    quoteNumber: String(row.quoteNumber ?? ''),
    mode: (['devis', 'virement', 'paiement', 'web', 'refus'] as QuoteEmailHistoryItem['mode'][]).includes(mode as never) ? (mode as QuoteEmailHistoryItem['mode']) : 'devis',
    recipientEmail: (row.recipientEmail as string | null) ?? null,
    subject: (row.subject as string | null) ?? null,
    message: (row.message as string | null) ?? null,
    totalTTC: Number(row.totalTTC ?? 0) || 0,
    totalHT: Number(row.totalHT ?? 0) || 0,
    emailSent: Boolean(row.emailSent),
    errorMessage: (row.errorMessage as string | null) ?? null,
    driveFileId: (row.driveFileId as string | null) ?? null,
    driveWebViewLink: (row.driveWebViewLink as string | null) ?? null,
    pdfFileName: (row.pdfFileName as string | null) ?? null,
    createdAt: String(row.createdAt ?? ''),
  };
}

export async function getQuoteEmailHistory(quoteId: string): Promise<QuoteEmailHistoryItem[]> {
  const raw = unwrapData<unknown>(await apiClient.get(`${BASE}/quotes/${encodeURIComponent(quoteId)}/email-history`));
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((r) => normalizeEmailHistoryItem(r as Record<string, unknown>));
}

export async function createPsCustomerFromQuote(quoteId: string, opts?: { useDevisEmailSuffix?: boolean }): Promise<{ prestashopId: number; email: string; addressId: number }> {
  return unwrapData(
    await apiClient.post(`${BASE}/quotes/${encodeURIComponent(quoteId)}/create-ps-customer`, {
      useDevisEmailSuffix: opts?.useDevisEmailSuffix ?? true,
    }),
  );
}

export async function getQuoteAddress(quoteId: string): Promise<QuoteAddress> {
  return unwrapData(await apiClient.get(`${BASE}/quotes/${encodeURIComponent(quoteId)}/address`));
}

export async function updateQuoteAddress(quoteId: string, payload: UpdateQuoteAddressPayload): Promise<{ success: boolean; addressId: number }> {
  return unwrapData(await apiClient.patch(`${BASE}/quotes/${encodeURIComponent(quoteId)}/address`, payload));
}

export async function createPrestashopOrderFromQuote(quoteId: string, fulfillment?: QuoteFulfillment, warehouse?: QuoteFulfillmentWarehouse): Promise<CreatePsOrderResult> {
  const body: { fulfillment?: QuoteFulfillment; warehouse?: QuoteFulfillmentWarehouse } = {};
  if (fulfillment) body.fulfillment = fulfillment;
  // L'entrepôt n'a de sens qu'en mode "classic".
  if (fulfillment === 'classic' && warehouse) body.warehouse = warehouse;
  const data = unwrapData<Record<string, unknown>>(await apiClient.post(`${BASE}/quotes/${encodeURIComponent(quoteId)}/create-prestashop-order`, body));
  const ref = pickString(data, ['reference', 'orderReference']);
  const orderId = data.prestashopOrderId ?? data.orderId ?? data.id_order;
  const explicitFail = data.success === false || data.success === 'false';
  const success = !explicitFail && (data.success === true || data.success === 'true' || ref != null || orderId != null);
  return {
    success,
    prestashopOrderId: orderId as string | number | undefined,
    reference: ref,
    message: pickString(data, ['message']),
  };
}

export async function proposeQuotePricing(items: QuotePricingProposalItem[], options?: { shippingOffered?: boolean }): Promise<QuotePricingProposalResponse> {
  return unwrapData(
    await apiClient.post(`${BASE}/quotes/pricing/propose`, {
      items,
      shippingOffered: options?.shippingOffered ?? false,
    }, { timeoutMs: LONG_REQUEST_TIMEOUT_MS }),
  );
}

/** Persiste un snapshot de la dernière proposition IA appliquée sur un devis. */
export async function saveAiProposalSnapshot(quoteId: string, proposal: QuotePricingProposalResponse): Promise<void> {
  await apiClient.put(`${BASE}/quotes/${encodeURIComponent(quoteId)}/ai-proposal`, proposal);
}

/** Efface le snapshot de proposition IA stocké (clic « Ignorer »). */
export async function deleteAiProposalSnapshot(quoteId: string): Promise<void> {
  await apiClient.delete(`${BASE}/quotes/${encodeURIComponent(quoteId)}/ai-proposal`);
}

/* ─── Prospects (recherche unifiée demandes + devis prospects) ───── */

export async function listQuoteProspects(params?: { search?: string; limit?: number }): Promise<ListQuoteProspectsResult> {
  const raw = await apiClient.get<{ data?: unknown; meta?: Record<string, unknown> }>(`${BASE}/quotes/prospects`, {
    query: {
      search: params?.search && params.search.trim().length >= 2 ? params.search.trim() : undefined,
      limit: params?.limit ?? 50,
    },
  });
  const list = Array.isArray(raw?.data) ? raw.data : [];
  const data = (list as Record<string, unknown>[]).map((r) => ({
    email: String(r.email ?? '').toLowerCase(),
    firstname: (r.firstname as string | null | undefined) ?? null,
    lastname: (r.lastname as string | null | undefined) ?? null,
    company: (r.company as string | null | undefined) ?? null,
    phone: (r.phone as string | null | undefined) ?? null,
    address1: (r.address1 as string | null | undefined) ?? null,
    postcode: (r.postcode as string | null | undefined) ?? null,
    city: (r.city as string | null | undefined) ?? null,
    country: (r.country as string | null | undefined) ?? null,
    prestashopCustomerId: typeof r.prestashopCustomerId === 'number' ? r.prestashopCustomerId : null,
    quoteCount: typeof r.quoteCount === 'number' && Number.isFinite(r.quoteCount) ? r.quoteCount : 0,
    lastQuoteId: (r.lastQuoteId as string | null | undefined) ?? null,
    lastQuoteReference: (r.lastQuoteReference as string | null | undefined) ?? null,
    lastStatus: (r.lastStatus as string | null | undefined) ?? null,
    lastQuoteCreatedAt: (r.lastQuoteCreatedAt as string | null | undefined) ?? null,
    hasQuoteRequest: Boolean(r.hasQuoteRequest),
    quoteRequestId: (r.quoteRequestId as string | null | undefined) ?? null,
    quoteRequestStatus: (r.quoteRequestStatus as string | null | undefined) ?? null,
    lastActivityAt: String(r.lastActivityAt ?? ''),
  }));
  return { data, meta: raw?.meta as { total?: number; limit?: number } | undefined };
}

// ─── Révisions ──────────────────────────────────────────────────────────────

export interface QuoteRevisionListItem {
  id: string;
  revisionNumber: number;
  totalProductHT: number;
  totalTax: number;
  totalTTC: number;
  totalMarginHT: number;
  statusAtPublish: string | null;
  emailLogId: string | null;
  hasPdf: boolean;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface QuoteRevisionList {
  currentRevision: number;
  revisionDraftOpen: boolean;
  revisions: QuoteRevisionListItem[];
}

export interface QuoteRevisionLineChange {
  kind: 'added' | 'removed' | 'changed';
  reference: string;
  productLabel: string | null;
  fields?: { field: string; before: unknown; after: unknown }[];
}

export interface QuoteRevisionDiff {
  from: number;
  to: number;
  lines: QuoteRevisionLineChange[];
  totals: { field: string; before: number; after: number }[];
}

const q = (id: string) => encodeURIComponent(id);

export async function listQuoteRevisions(quoteId: string): Promise<QuoteRevisionList> {
  const raw = unwrapData<Partial<QuoteRevisionList>>(await apiClient.get(`${BASE}/quotes/${q(quoteId)}/revisions`));
  return {
    currentRevision: Number(raw.currentRevision ?? 0),
    revisionDraftOpen: raw.revisionDraftOpen === true,
    revisions: Array.isArray(raw.revisions) ? (raw.revisions as QuoteRevisionListItem[]) : [],
  };
}

export async function startQuoteRevision(quoteId: string, reason?: string): Promise<QuoteRevisionState> {
  return unwrapData<QuoteRevisionState>(await apiClient.post(`${BASE}/quotes/${q(quoteId)}/revisions/start`, { reason: reason?.trim() || undefined }));
}

export async function cancelQuoteRevisionDraft(quoteId: string): Promise<QuoteRevisionState> {
  return unwrapData<QuoteRevisionState>(await apiClient.post(`${BASE}/quotes/${q(quoteId)}/revisions/cancel`));
}

export async function restoreQuoteRevision(quoteId: string, revisionNumber: number): Promise<QuoteRevisionState> {
  return unwrapData<QuoteRevisionState>(await apiClient.post(`${BASE}/quotes/${q(quoteId)}/revisions/${revisionNumber}/restore`));
}

export async function getQuoteRevisionDiff(quoteId: string, from: number, to: number): Promise<QuoteRevisionDiff> {
  return unwrapData<QuoteRevisionDiff>(await apiClient.get(`${BASE}/quotes/${q(quoteId)}/revisions/${from}/diff/${to}`));
}


// ─── PrestaShop ─────────────────────────────────────────────────────────────

export async function searchPrestaShopCustomers(q: string, limit = 15): Promise<PrestaCustomerHit[]> {
  const data = unwrapData<unknown>(await apiClient.get(`${BASE}/prestashop/customers/search`, { query: { q, limit } }));
  const list = Array.isArray(data) ? data : ((data as { items?: unknown[] })?.items ?? []);
  return list.map(parsePrestaCustomerHit);
}

export async function listRecentPrestaShopCustomers(limit = 20): Promise<PrestaCustomerHit[]> {
  const data = unwrapData<unknown>(await apiClient.get(`${BASE}/prestashop/customers/recent`, { query: { limit } }));
  const list = Array.isArray(data) ? data : ((data as { items?: unknown[] })?.items ?? []);
  return list.map(parsePrestaCustomerHit);
}

export async function resolvePrestaShopCustomersBatch(ids: (string | number)[]): Promise<Record<string, PrestaCustomerHit>> {
  const cleaned = [
    ...new Set(ids.map((v) => (typeof v === 'number' ? v : parseInt(String(v), 10))).filter((n) => Number.isFinite(n) && n > 0)),
  ];
  if (cleaned.length === 0) return {};
  const data = unwrapData<Record<string, unknown>>(await apiClient.post(`${BASE}/prestashop/customers/resolve-batch`, { ids: cleaned }));
  const out: Record<string, PrestaCustomerHit> = {};
  if (!data || typeof data !== 'object') return out;
  for (const [key, value] of Object.entries(data)) out[key] = parsePrestaCustomerHit(value);
  return out;
}

export async function getPrestaShopCustomer(id: string | number): Promise<PrestaCustomerDetail> {
  const raw = unwrapData<Record<string, unknown>>(
    await apiClient.get(`${BASE}/prestashop/customers/${encodeURIComponent(String(id))}`),
  );
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Client PrestaShop ${id} introuvable`);
  }
  const cust = (raw.customer && typeof raw.customer === 'object' ? raw.customer : raw) as Record<string, unknown>;
  const addressesRaw = raw.addresses ?? raw.address ?? cust.addresses;
  const addresses = Array.isArray(addressesRaw)
    ? (addressesRaw as Record<string, unknown>[]).map((a) => {
        const aid = a.id ?? a.id_address;
        const idAddr = typeof aid === 'string' || typeof aid === 'number' ? aid : aid != null ? String(aid) : undefined;
        return {
          id: idAddr,
          alias: pickString(a, ['alias']),
          company: pickString(a, ['company']),
          firstname: pickString(a, ['firstname', 'firstName']),
          lastname: pickString(a, ['lastname', 'lastName']),
          address1: pickString(a, ['address1', 'address']),
          address2: pickString(a, ['address2']),
          postcode: pickString(a, ['postcode', 'zipcode']),
          city: pickString(a, ['city']),
          phone: pickString(a, ['phone']),
          mobile: pickString(a, ['mobile', 'phone_mobile']),
          countryIso: pickString(a, ['countryIso', 'country_iso', 'country']),
        };
      })
    : undefined;
  const rawCid = cust.id ?? cust.id_customer ?? id;
  const customerId = typeof rawCid === 'string' || typeof rawCid === 'number' ? rawCid : String(rawCid);
  return {
    id: customerId,
    email: pickString(cust, ['email']),
    firstname: pickString(cust, ['firstname', 'firstName']),
    lastname: pickString(cust, ['lastname', 'lastName']),
    company: pickString(cust, ['company']),
    addresses,
  };
}

export async function updatePrestaShopCustomer(
  id: string | number,
  payload: { email?: string; firstname?: string; lastname?: string; company?: string },
) {
  return unwrapData(await apiClient.patch(`${BASE}/prestashop/customers/${encodeURIComponent(String(id))}`, payload));
}

export async function createPrestaShopCustomerAddress(
  customerId: string | number,
  payload: Record<string, string | undefined>,
) {
  return unwrapData(await apiClient.post(`${BASE}/prestashop/customers/${encodeURIComponent(String(customerId))}/addresses`, payload));
}

export async function updatePrestaShopCustomerAddress(
  customerId: string | number,
  addressId: string | number,
  payload: Record<string, string | undefined>,
) {
  return unwrapData(
    await apiClient.patch(
      `${BASE}/prestashop/customers/${encodeURIComponent(String(customerId))}/addresses/${encodeURIComponent(String(addressId))}`,
      payload,
    ),
  );
}

/* ─── PrestaShop (produit) ─────────────────────────────────────────── */

export async function resolveProductByReference(reference: string): Promise<ProductResolveResult> {
  const data = unwrapData<Record<string, unknown>>(
    await apiClient.get(`${BASE}/prestashop/products/resolve`, { query: { reference: reference.trim() } }),
  );
  const unitPriceHT = pickNumber(data, ['unitPriceHT', 'unit_price_ht', 'priceHT', 'price_ht', 'price', 'wholesale_price']) ?? 0;
  const basePriceHT = pickNumber(data, ['basePriceHT', 'base_price_ht', 'basePrice', 'base_price']) ?? undefined;
  const taxRate = pickNumber(data, ['taxRate', 'tax_rate', 'rate', 'tva']) ?? 0.2;
  const label = pickString(data, ['label', 'name', 'designation', 'productName', 'product_name']) ?? reference;
  const pidRaw = data.prestashopProductId ?? data.id_product ?? data.productId;
  const prestashopProductId = typeof pidRaw === 'string' || typeof pidRaw === 'number' ? pidRaw : undefined;
  const activeRaw = data.active;
  const active =
    activeRaw === true || activeRaw === 1 || activeRaw === '1' ? true : activeRaw === false || activeRaw === 0 || activeRaw === '0' ? false : undefined;
  const hspRaw = data.hasSpecificPrice;
  const hasSpecificPrice = hspRaw === true || hspRaw === 1 || hspRaw === '1' ? true : undefined;

  return {
    reference: pickString(data, ['reference', 'ref']) ?? reference,
    label,
    unitPriceHT,
    basePriceHT,
    taxRate: taxRate > 1 ? taxRate / 100 : taxRate,
    prestashopProductId,
    imageUrl: pickProductImageUrl(data),
    active,
    hasSpecificPrice,
  };
}

/** Recherche produits pendant la saisie (autocomplétion ligne de devis). */
export async function searchPrestaShopProducts(q: string, limit = 20): Promise<PrestaProductSearchHit[]> {
  const data = unwrapData<unknown>(await apiClient.get(`${BASE}/prestashop/products/search`, { query: { q: q.trim(), limit } }));
  const list = Array.isArray(data)
    ? data
    : ((data as { items?: unknown[]; products?: unknown[] })?.items ?? (data as { products?: unknown[] })?.products ?? []);
  return list.map((row: unknown) => {
    const o = row as Record<string, unknown>;
    let tr = pickNumber(o, ['taxRate', 'tax_rate', 'rate', 'tva']) ?? 0.2;
    if (tr > 1) tr /= 100;
    const ref = pickString(o, ['reference', 'ref', 'productReference']) ?? '';
    const pidRaw = o.prestashopProductId ?? o.id_product ?? o.productId;
    return {
      reference: ref,
      label: pickString(o, ['label', 'name', 'designation', 'productName', 'product_name']) ?? ref,
      unitPriceHT: pickNumber(o, ['unitPriceHT', 'unit_price_ht', 'priceHT', 'price_ht', 'price']),
      basePriceHT: pickNumber(o, ['basePriceHT', 'base_price_ht', 'basePrice', 'base_price']) ?? undefined,
      taxRate: tr,
      prestashopProductId: typeof pidRaw === 'string' || typeof pidRaw === 'number' ? pidRaw : undefined,
      imageUrl: pickProductImageUrl(o),
    };
  });
}

/** Récupère le statut actif/inactif PrestaShop pour un lot de références. */
export async function getPrestaShopProductsActiveStatus(
  references: string[],
): Promise<Record<string, { active: boolean; prestashopProductId: number }>> {
  if (references.length === 0) return {};
  return unwrapData(
    await apiClient.get(`${BASE}/prestashop/products/active-status`, { query: { references: references.join(',') } }),
  );
}

// ─── Catalogue ──────────────────────────────────────────────────────────────

export async function getApproRowsBatchByReferences(
  references: string[],
  fields?: ('stock' | 'pricing' | 'sales' | 'buybox')[],
): Promise<BatchApproRowsResponse> {
  return apiClient.post<BatchApproRowsResponse>(`${BASE}/appro-rows/batch-by-references`, {
    references,
    ...(fields && fields.length > 0 ? { fields } : {}),
  });
}

/** Assure la présence d'un produit dans ApproRows via le seul `batipowerId`. */
export async function ensureApproRow(data: {
  batipowerId: number;
  previSalesByMonth?: number;
}): Promise<EnsureApproRowResult> {
  return apiClient.post<EnsureApproRowResult>(`${BASE}/appro-rows/ensure`, data);
}

/**
 * Calcule le coût transport HT GLS pour un poids donné (grammes), via la
 * grille tarifaire CarrierCost côté backend. Retourne 0 si le poids est
 * invalide ou si aucune tranche ne correspond.
 */
export async function getGlsShippingCostHT(weightGrams: number): Promise<number> {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) return 0;
  try {
    const value = await apiClient.get<number>(`${BASE}/gls/calculate-price/${Math.round(weightGrams)}`);
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Résout (ou crée si absent) un produit au catalogue depuis une référence
 * eBAT / fabricant, pour ajouter une ligne au devis. `referenceInterne` à
 * `true` cherche par `codeDombasle`/`codeFlevy` (mode `manufacturer_sku`
 * inversé), à `false` par référence PrestaShop (comportement historique).
 */
export async function getAddProductSupplier(
  reference: string,
  referenceInterne = false,
  warehouse?: string,
): Promise<AddProductResult> {
  const query = warehouse ? { warehouse } : undefined;
  const data = await apiClient.get<AddProductResult>(
    `${BASE}/products/add-product/${encodeURIComponent(reference)}/${referenceInterne}`,
    query ? { query } : undefined,
  );
  return {
    success: !!(data?.success || data?.batipowerId),
    batipowerId: data?.batipowerId ?? null,
    reference: data?.reference ?? null,
    supplierReference: data?.supplierReference ?? null,
  };
}

/**
 * Création « forcée » d'un produit PrestaShop + ApproRow sans passer par
 * eBatPro. Utilisé pour les références introuvables sur eBatPro (lignes de
 * devis « Produit PS non lié ») afin de pouvoir convertir le devis en commande.
 */
export async function addProductRaw(
  data: AddProductRawPayload,
): Promise<{ success: boolean; batipowerId: number | null }> {
  return apiClient.post(`${BASE}/products/add-product-raw`, data);
}
