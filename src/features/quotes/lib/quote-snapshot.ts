import type { QuoteGlobalDiscountType } from '@/types/hubCustomerQuotes';
import type { LineRow } from './line-types';

export type QuoteSnapshotInput = {
  lines: LineRow[];
  shippingFeeHT: number;
  shippingFeeOffered: boolean;
  supplierShippingOffered: boolean;
  transportChecked: boolean;
  globalDiscountLabel: string;
  globalDiscountType: QuoteGlobalDiscountType;
  globalDiscountValue: number;
  internalNotes: string;
  customerNotes: string;
  nbColisOverride: number | null;
  recommendedShippingHT: number | null;
  weeeTaxHT: number;
};

/**
 * Snapshot JSON stable des champs utilisateur persistables. Utilisé pour
 * détecter les vraies modifications utilisateur et éviter les auto-saves
 * fantômes (enrichissement post-load, `active` PrestaShop, etc.). Ne contient
 * volontairement PAS `imageUrl`, `active`, `weightInGrams`, etc. qui sont
 * dérivés du catalogue et non éditables par l'utilisateur.
 */
export function computeQuoteSnapshotKey(input: QuoteSnapshotInput): string {
  return JSON.stringify({
    lines: input.lines.map((L) => ({
      r: L.reference,
      q: L.quantity,
      u: L.unitPriceHT,
      pm: L.priceMode ?? null,
      n: L.note ?? null,
      d: L.discountPct ?? 0,
      t: L.taxRate,
      nc: L.nbColisLine ?? null,
      ncm: L.nbColisLineManual ?? false,
      c: L.content ?? '',
      cst: L.costHT ?? null,
      neg: L.negotiatedCostHT ?? null,
      e: L.ecotaxHT ?? null,
      ct: L.catalogPriceTTC ?? 0,
      lt: L.lineType ?? 'product',
      ps: L.prestashopProductId != null ? String(L.prestashopProductId) : null,
    })),
    shippingFeeHT: input.shippingFeeHT,
    shippingFeeOffered: input.shippingFeeOffered,
    supplierShippingOffered: input.supplierShippingOffered,
    transportChecked: input.transportChecked,
    globalDiscountLabel: input.globalDiscountLabel,
    globalDiscountType: input.globalDiscountType,
    globalDiscountValue: input.globalDiscountValue,
    internalNotes: input.internalNotes,
    customerNotes: input.customerNotes,
    nbColisOverride: input.nbColisOverride,
    recommendedShippingHT: input.recommendedShippingHT,
    weeeTaxHT: input.weeeTaxHT,
  });
}
