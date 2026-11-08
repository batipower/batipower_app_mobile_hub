import type { QuoteGlobalDiscountType } from '@/types/hubCustomerQuotes';
import { getLineGlsScope, GLS_MAX_WEIGHT_G } from './gls-scope';
import type { LineRow } from './line-types';
import { lineTotalTTC, normalizeTaxRate, round2 } from './quote-math';

export type QuoteTotals = {
  subtotalHT: number;
  promoAmount: number;
  netProductHT: number;
  shippingBilledHT: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  catalogProductTTC: number;
  catalogShippingTTC: number;
  catalogReferenceTTC: number;
};

/** Récapitulatif financier du devis — porté depuis le `useMemo totals` de la source. */
export function computeTotals(params: {
  lines: LineRow[];
  globalDiscountType: QuoteGlobalDiscountType;
  globalDiscountValue: number;
  shippingFeeHT: number;
  shippingFeeOffered: boolean;
}): QuoteTotals {
  const { lines, globalDiscountType, globalDiscountValue, shippingFeeHT, shippingFeeOffered } = params;
  let subtotalHTRaw = 0;
  let catalogProductTTC = 0;
  const vatRawMap = new Map<number, number>();
  for (const L of lines) {
    if ((L.lineType ?? 'product') !== 'product') continue;
    const lineHT = L.quantity * L.unitPriceHT;
    subtotalHTRaw += lineHT;
    catalogProductTTC += L.quantity * L.catalogPriceTTC;
    const rate = normalizeTaxRate(L.taxRate);
    vatRawMap.set(rate, (vatRawMap.get(rate) ?? 0) + lineHT);
  }
  const subtotalHT = round2(subtotalHTRaw);
  let promoAmount = 0;
  if (globalDiscountValue > 0) {
    if (globalDiscountType === 'PERCENT') {
      const pct = Math.min(100, Math.max(0, globalDiscountValue));
      promoAmount = round2((subtotalHT * pct) / 100);
    } else {
      promoAmount = round2(Math.min(globalDiscountValue, subtotalHT));
    }
  }
  const promoRatio = subtotalHTRaw > 0 ? promoAmount / subtotalHTRaw : 0;
  let totalTVA = 0;
  for (const [rate, baseHTRaw] of vatRawMap) {
    const netBase = round2(baseHTRaw * (1 - promoRatio));
    totalTVA += round2(netBase * rate);
  }
  const shippingBilledHT = shippingFeeOffered ? 0 : Math.max(0, shippingFeeHT);
  const shippingTVA = round2(shippingBilledHT * 0.2);
  totalTVA = round2(totalTVA + shippingTVA);
  const netProductHT = round2(subtotalHT - promoAmount);
  const totalHT = round2(netProductHT + shippingBilledHT);
  const totalTTC = round2(totalHT + totalTVA);
  const catalogShippingHT = Math.max(0, shippingFeeHT);
  const catalogShippingTTC = round2(catalogShippingHT * 1.2);
  const catalogReferenceTTC = round2(catalogProductTTC + catalogShippingTTC);
  return {
    subtotalHT,
    promoAmount,
    netProductHT,
    shippingBilledHT,
    totalHT,
    totalTVA,
    totalTTC,
    catalogProductTTC,
    catalogShippingTTC,
    catalogReferenceTTC,
  };
}

export type QuoteColumnTotals = {
  sumQuantity: number;
  sumCatalogTTC: number;
  sumPrixClientTTC: number;
  sumPAHT: number;
  linesMissingPA: number;
};

/**
 * Sommes par colonne du tableau de lignes, calculées ligne par ligne avec
 * exactement les mêmes formules que les cellules affichées (Catalogue TTC,
 * Prix client · Total, PA HT), pour alimenter la ligne "Total" en bas du
 * tableau.
 */
export function computeColumnTotals(lines: LineRow[]): QuoteColumnTotals {
  let sumQuantity = 0;
  let sumCatalogTTC = 0;
  let sumPrixClientTTC = 0;
  let sumPAHT = 0;
  let linesMissingPA = 0;
  for (const L of lines) {
    if ((L.lineType ?? 'product') !== 'product') continue;
    sumQuantity += L.quantity;
    sumCatalogTTC += round2(L.quantity * L.catalogPriceTTC);
    sumPrixClientTTC += lineTotalTTC(L.quantity, L.unitPriceHT, L.taxRate);
    const forcedBase = L.negotiatedCostHT != null && L.negotiatedCostHT > 0 ? L.negotiatedCostHT : null;
    const readBase = L.costEbatHT != null && L.costEbatHT > 0 ? L.costEbatHT : null;
    const effectiveBase = forcedBase != null ? forcedBase : readBase;
    if (effectiveBase != null) {
      const eco = L.ecotaxHT != null && L.ecotaxHT > 0 ? L.ecotaxHT : 0;
      sumPAHT += round2((effectiveBase + eco) * L.quantity);
    } else {
      linesMissingPA += 1;
    }
  }
  return {
    sumQuantity,
    sumCatalogTTC: round2(sumCatalogTTC),
    sumPrixClientTTC: round2(sumPrixClientTTC),
    sumPAHT: round2(sumPAHT),
    linesMissingPA,
  };
}

export type SectionSubtotal = {
  /** Clé de la dernière ligne produit du groupe — le sous-total s'affiche juste après. */
  afterKey: string;
  headerKey: string;
  headerLabel: string;
  headerType: 'title' | 'text';
  quantity: number;
  ht: number;
  ttc: number;
};

type SectionSubtotalSource = {
  key: string;
  lineType?: 'product' | 'title' | 'text';
  content?: string;
  quantity: number;
  unitPriceHT: number;
  taxRate: number;
};

/**
 * Sous-totaux par section : chaque ligne `title` ou `text` ouvre un groupe ;
 * les produits suivants jusqu'au prochain titre/texte sont sommés. Pas de
 * sous-total si le groupe n'a aucun produit.
 */
export function computeSectionSubtotals(lines: SectionSubtotalSource[]): SectionSubtotal[] {
  type Acc = {
    headerKey: string;
    headerLabel: string;
    headerType: 'title' | 'text';
    lastProductKey: string | null;
    quantity: number;
    ht: number;
    ttc: number;
  };
  const result: SectionSubtotal[] = [];
  let acc: Acc | null = null;

  const flush = () => {
    if (!acc || !acc.lastProductKey || acc.quantity <= 0) {
      acc = null;
      return;
    }
    result.push({
      afterKey: acc.lastProductKey,
      headerKey: acc.headerKey,
      headerLabel: acc.headerLabel,
      headerType: acc.headerType,
      quantity: acc.quantity,
      ht: round2(acc.ht),
      ttc: round2(acc.ttc),
    });
    acc = null;
  };

  for (const L of lines) {
    const type = L.lineType ?? 'product';
    if (type === 'title' || type === 'text') {
      flush();
      acc = {
        headerKey: L.key,
        headerLabel: (L.content ?? '').trim(),
        headerType: type,
        lastProductKey: null,
        quantity: 0,
        ht: 0,
        ttc: 0,
      };
      continue;
    }
    if (!acc) continue;
    acc.lastProductKey = L.key;
    acc.quantity += L.quantity;
    acc.ht += L.quantity * L.unitPriceHT;
    acc.ttc += lineTotalTTC(L.quantity, L.unitPriceHT, normalizeTaxRate(L.taxRate));
  }
  flush();
  return result;
}

export type WeightSummary = {
  totalWeightGrams: number;
  linesWithWeight: number;
  linesMissingWeight: number;
};

/** Récap poids des lignes (utilisé pour la recommandation transport). */
export function computeWeightSummary(lines: LineRow[]): WeightSummary {
  let total = 0;
  let withWeight = 0;
  let missing = 0;
  for (const L of lines) {
    const w = L.weightInGrams;
    if (w != null && Number.isFinite(w) && w > 0) {
      total += w * L.quantity;
      withWeight += 1;
    } else {
      missing += 1;
    }
  }
  return { totalWeightGrams: total, linesWithWeight: withWeight, linesMissingWeight: missing };
}

/** Poids par colis (grammes) pour le calcul GLS. Arrondi entier au-dessus. */
export function computeWeightPerParcel(totalWeightGrams: number, nbColis: number): number {
  const n = Math.max(1, Math.floor(nbColis) || 1);
  if (totalWeightGrams <= 0) return 0;
  return Math.ceil(totalWeightGrams / n);
}

/** Lignes hors périmètre GLS (poids/dimensions unitaires dépassant les limites du transporteur). */
export function computeGlsOutOfScopeLines(lines: LineRow[]): LineRow[] {
  return lines.filter((L) => (L.lineType ?? 'product') === 'product' && getLineGlsScope(L).outOfScope);
}

export function computeHasGlsOutOfScope(lines: LineRow[], weightPerParcel: number): boolean {
  return computeGlsOutOfScopeLines(lines).length > 0 || weightPerParcel > GLS_MAX_WEIGHT_G;
}

/** Garde-fou anti-coquille : une ligne produit avec un prix de vente à 0 doit bloquer la génération / l'envoi du devis. */
export function computeHasZeroPriceLine(lines: LineRow[]): boolean {
  return lines.some((L) => (L.lineType ?? 'product') === 'product' && !(L.unitPriceHT > 0));
}

/** Lignes « Produit PS non lié » : lignes produit sans `prestashopProductId`. */
export function computeMissingCatalogLines(lines: LineRow[]): LineRow[] {
  return lines.filter((L) => (L.lineType ?? 'product') === 'product' && !L.prestashopProductId && L.reference.trim().length > 0);
}

/**
 * Signature courante des entrées du calcul GLS. Utilisée pour la détection de
 * staleness : si la signature de reco enregistrée diverge de celle-ci, la
 * reco affichée est obsolète et l'utilisateur doit cliquer sur « Recalculer ».
 */
export function computeRecoSignature(totalWeightGrams: number, nbColis: number, linesMissingWeight: number): string {
  return `${totalWeightGrams}|${nbColis}|${linesMissingWeight}`;
}

/**
 * Signature des entrées transport « visibles » par le vendeur. Toute
 * modification invalide la validation manuelle `transportChecked`.
 */
export function computeTransportSignature(params: {
  totalWeightGrams: number;
  nbColis: number;
  shippingFeeHT: number;
  shippingFeeOffered: boolean;
  supplierShippingOffered: boolean;
  recoSignature: string | null;
}): string {
  const { totalWeightGrams, nbColis, shippingFeeHT, shippingFeeOffered, supplierShippingOffered, recoSignature } = params;
  return `${totalWeightGrams}|${nbColis}|${shippingFeeHT}|${shippingFeeOffered ? 1 : 0}|${supplierShippingOffered ? 1 : 0}|${recoSignature ?? ''}`;
}
