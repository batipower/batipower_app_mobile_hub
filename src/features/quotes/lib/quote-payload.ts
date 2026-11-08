import type { CreateOrUpdateQuotePayload, PrestaCustomerDetail, QuoteCustomerDraft, QuoteGlobalDiscountType } from '@/types/hubCustomerQuotes';
import type { LineRow } from './line-types';
import { normalizeTaxRate } from './quote-math';

export type BuildPayloadParams = {
  lines: LineRow[];
  quoteStatus: string;
  internalNotes: string;
  customerNotes: string;
  shippingFeeHT: number;
  shippingFeeOffered: boolean;
  supplierShippingOffered: boolean;
  recommendedShippingHT: number | null;
  isRecoStale: boolean;
  globalDiscountLabel: string;
  globalDiscountType: QuoteGlobalDiscountType;
  globalDiscountValue: number;
  weeeTaxHT: number;
  nbColisOverride: number | null;
  transportChecked: boolean;
  clientMode: 'prestashop' | 'prospect';
  selectedCustomer: PrestaCustomerDetail | null;
  draft: QuoteCustomerDraft;
  quoteDeliveryAddressId: number | undefined;
  quoteInvoiceAddressId: number | undefined;
};

/**
 * Construit le payload API (`CreateOrUpdateQuotePayload`) à partir de l'état
 * courant de l'éditeur — porté depuis `buildPayload` du front-printer.
 */
export function buildQuotePayload(p: BuildPayloadParams): CreateOrUpdateQuotePayload {
  const linePayload = p.lines.map((L, idx) => {
    const lineType = L.lineType ?? 'product';
    if (lineType !== 'product') {
      return {
        lineType: lineType as 'title' | 'text',
        content: L.content || '',
        reference: '',
        quantity: 0,
        unitPriceHT: 0,
        sortOrder: idx,
      };
    }
    const tr = normalizeTaxRate(L.taxRate);
    const catalogHT = L.catalogPriceTTC > 0 ? L.catalogPriceTTC / (1 + tr) : L.unitPriceHT / Math.max(0.0001, 1 - (L.discountPct || 0) / 100);
    const effectiveHT = L.unitPriceHT;

    let storedUnitPriceHT: number;
    let impliedDiscount: number;
    if (catalogHT > 0 && effectiveHT < catalogHT) {
      storedUnitPriceHT = catalogHT;
      impliedDiscount = (1 - effectiveHT / catalogHT) * 100;
    } else {
      storedUnitPriceHT = effectiveHT;
      impliedDiscount = 0;
    }

    return {
      lineType: 'product' as const,
      note: L.note || undefined,
      reference: L.reference,
      quantity: L.quantity,
      unitPriceHT: storedUnitPriceHT,
      productLabel: L.productLabel,
      taxRate: tr,
      prestashopProductId: L.prestashopProductId,
      imageUrl: L.imageUrl,
      lineDiscountPercent: impliedDiscount > 0 ? impliedDiscount : undefined,
      effectiveUnitPriceHT: L.unitPriceHT,
      catalogPriceHT: L.catalogPriceTTC > 0 ? L.catalogPriceTTC / (1 + tr) : undefined,
      baseCatalogPriceHT: L.baseCatalogPriceTTC ? L.baseCatalogPriceTTC / (1 + tr) : undefined,
      priceMode: L.priceMode,
      nbColisLine: L.nbColisLineManual ? L.nbColisLine : undefined,
      purchasePriceHT: L.costHT != null && L.costHT > 0 ? L.costHT : undefined,
      proposedPurchasePriceHT: L.negotiatedCostHT != null && L.negotiatedCostHT > 0 ? L.negotiatedCostHT : undefined,
      ecotaxHT: L.ecotaxHT != null && L.ecotaxHT >= 0 ? L.ecotaxHT : undefined,
      sortOrder: idx,
    };
  });

  const freshRecoAvailable = p.recommendedShippingHT != null && p.recommendedShippingHT > 0 && !p.isRecoStale;
  const base: CreateOrUpdateQuotePayload = {
    lines: linePayload,
    status: p.quoteStatus || 'BROUILLON',
    internalNotes: p.internalNotes.trim() || undefined,
    customerNotes: p.customerNotes.trim() || undefined,
    shippingFeeHT: Math.max(0, p.shippingFeeHT),
    shippingFeeOffered: p.shippingFeeOffered,
    ...(freshRecoAvailable ? { shippingCostHT: p.recommendedShippingHT! } : {}),
    supplierShippingOffered: p.supplierShippingOffered,
    globalDiscountLabel: p.globalDiscountLabel.trim(),
    globalDiscountType: p.globalDiscountType,
    globalDiscountValue: p.globalDiscountValue,
    totalWeeeTaxHT: p.weeeTaxHT > 0 ? p.weeeTaxHT : 0,
    nbColis: p.nbColisOverride,
    transportConfirmed: p.transportChecked,
  };

  if (p.clientMode === 'prestashop' && p.selectedCustomer) {
    const savedDelivery = p.quoteDeliveryAddressId;
    const savedInvoice = p.quoteInvoiceAddressId;
    const firstAddrIdRaw = p.selectedCustomer.addresses?.[0]?.id;
    const firstAddrId = firstAddrIdRaw != null && firstAddrIdRaw !== '' ? Number(firstAddrIdRaw) : NaN;
    const fallbackAddrId = Number.isFinite(firstAddrId) && firstAddrId > 0 ? firstAddrId : undefined;
    const deliveryId = savedDelivery ?? fallbackAddrId;
    const invoiceId = savedInvoice ?? fallbackAddrId;
    return {
      ...base,
      customerPrestashopId: p.selectedCustomer.id,
      ...(deliveryId ? { deliveryAddressId: deliveryId } : {}),
      ...(invoiceId ? { invoiceAddressId: invoiceId } : {}),
    };
  }

  if (p.clientMode === 'prospect') {
    const snapshot: QuoteCustomerDraft = {
      company: p.draft.company?.trim() || undefined,
      firstname: p.draft.firstname?.trim() || undefined,
      lastname: p.draft.lastname?.trim() || undefined,
      email: p.draft.email?.trim() || undefined,
      phone: p.draft.phone?.trim() || undefined,
      address1: p.draft.address1?.trim() || undefined,
      postcode: p.draft.postcode?.trim() || undefined,
      city: p.draft.city?.trim() || undefined,
      country: p.draft.country?.trim() || 'FR',
    };
    return { ...base, customerSnapshot: snapshot, customerDraft: snapshot };
  }

  return base;
}

export function emptyCustomerDraft(): QuoteCustomerDraft {
  return { company: '', firstname: '', lastname: '', email: '', phone: '', address1: '', postcode: '', city: '', country: 'FR' };
}
