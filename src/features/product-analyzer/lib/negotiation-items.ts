import type { CategoryTypeEnum } from '@/types/discussions';

import { suggestCategoryFromRules } from './category-rules';

export type NegotiationCountry = 'FR' | 'DE' | 'IT' | 'ES' | 'UK';
export const ALL_NEGO_COUNTRIES: NegotiationCountry[] = ['FR', 'DE', 'IT', 'ES', 'UK'];
export const NEGO_COUNTRY_FLAG: Record<NegotiationCountry, string> = {
  FR: '🇫🇷',
  DE: '🇩🇪',
  IT: '🇮🇹',
  ES: '🇪🇸',
  UK: '🇬🇧',
};

export const DEFAULT_TARGET_MARGIN_PCT = 10;
export const MARGIN_PRESETS = [0, 3, 5, 7, 10] as const;

const AMAZON_COMMISSION = 0.15;
const AMAZON_SERVICE_FEE_FACTOR = 1.03;
export const AMAZON_TOTAL_TAKE_RATE = AMAZON_COMMISSION * AMAZON_SERVICE_FEE_FACTOR;
const VAT_RATE_DEFAULT = 0.2;
const VAT_RATE_FR = 0.2;

export type NegotiationDialogItem = {
  stagingUuid: string;
  designation: string;
  ean?: string;
  asin?: string;
  codeEbat?: string;
  /** Codes internes par fournisseur / entrepôt : seul `distributorCode` sert (offres sans code à rechercher). */
  distributorOffers?: { distributorCode?: string | null }[] | null;
  warehouse?: string | null;
  status?: string | null;
  /** Poids unitaire (g). Absent / 0 : coût transport indisponible, prix de négo faussé. */
  weightGrams?: number | null;
  customerPriceHT?: number;
  customerPriceFlevyHT?: number;
  customerPriceDombasleHT?: number;
  recommendedBuyPrice?: number;
  viabilityByCountry?: Partial<
    Record<
      NegotiationCountry,
      {
        sourcePriceTTC?: number | null;
        vatRate?: number | null;
        marginPercent?: number | null;
        recommendedBuyPrice?: number | null;
        pvHT?: number | null;
        carrierCostHT?: number | null;
      }
    >
  > | null;
  manomano?: { found?: boolean | null; priceTTC?: number | null } | null;
  leroyMerlin?: { found?: boolean | null; priceTTC?: number | null } | null;
  castorama?: { found?: boolean | null; priceTTC?: number | null } | null;
  marketplaceEntries?: {
    platform: string;
    priceTTC: number;
    seller?: string | null;
  }[] | null;
};

export type NegotiationStagingSource = {
  uuid: string;
  designation?: string | null;
  ean?: string | null;
  asin?: string | null;
  codeEbat?: string | null;
  distributorOffers?: { distributorCode?: string | null }[] | null;
  warehouse?: string | null;
  status?: string | null;
  weightGrams?: number | null;
  customerPriceHT?: number | null;
  customerPriceFlevyHT?: number | null;
  customerPriceDombasleHT?: number | null;
  recommendedBuyPrice?: number | null;
  viabilityByCountry?: NegotiationDialogItem['viabilityByCountry'];
  manomano?: { found?: boolean | null; priceTTC?: number | null } | null;
  leroyMerlin?: { found?: boolean | null; priceTTC?: number | null } | null;
  castorama?: { found?: boolean | null; priceTTC?: number | null } | null;
};

export type MarketplaceEntryLike = {
  platform: string;
  priceTTC: number;
  seller?: string | null;
};

export function toNegotiationDialogItem(
  item: NegotiationStagingSource,
  mpEntries?: MarketplaceEntryLike[] | null,
): NegotiationDialogItem {
  return {
    stagingUuid: item.uuid,
    designation: item.designation ?? '—',
    ean: item.ean ?? undefined,
    asin: item.asin ?? undefined,
    codeEbat: item.codeEbat ?? undefined,
    distributorOffers: item.distributorOffers?.map((o) => ({ distributorCode: o.distributorCode ?? null })) ?? null,
    warehouse: item.warehouse ?? null,
    status: item.status ?? null,
    weightGrams: item.weightGrams ?? null,
    customerPriceHT: item.customerPriceHT ?? undefined,
    customerPriceFlevyHT: item.customerPriceFlevyHT ?? undefined,
    customerPriceDombasleHT: item.customerPriceDombasleHT ?? undefined,
    recommendedBuyPrice: item.recommendedBuyPrice ?? undefined,
    viabilityByCountry: item.viabilityByCountry
      ? Object.fromEntries(
          Object.entries(item.viabilityByCountry).map(([c, v]) => [
            c,
            {
              sourcePriceTTC: v?.sourcePriceTTC ?? null,
              vatRate: v?.vatRate ?? null,
              marginPercent: v?.marginPercent ?? null,
              recommendedBuyPrice: v?.recommendedBuyPrice ?? null,
              pvHT: v?.pvHT ?? null,
              carrierCostHT: v?.carrierCostHT ?? null,
            },
          ]),
        )
      : null,
    manomano: item.manomano
      ? { found: item.manomano.found ?? null, priceTTC: item.manomano.priceTTC ?? null }
      : null,
    leroyMerlin: item.leroyMerlin
      ? { found: item.leroyMerlin.found ?? null, priceTTC: item.leroyMerlin.priceTTC ?? null }
      : null,
    castorama: item.castorama
      ? { found: item.castorama.found ?? null, priceTTC: item.castorama.priceTTC ?? null }
      : null,
    marketplaceEntries: mpEntries?.length
      ? mpEntries.map((e) => ({
          platform: e.platform,
          priceTTC: e.priceTTC,
          seller: e.seller ?? null,
        }))
      : null,
  };
}

/** Produit sans poids exploitable (null / 0) : le port n'est pas calculable, le prix de négo serait faussé. */
export function hasNoWeight(item: Pick<NegotiationDialogItem, 'weightGrams'>): boolean {
  return item.weightGrams == null || !(item.weightGrams > 0);
}

export const SERVICE_LABEL: Readonly<Record<string, string>> = {
  ELECTRICITE: 'Électricité',
  VENTILATION: 'Ventilation',
  PLOMBERIE: 'Plomberie',
  CHAUFFAGE: 'Chauffage',
  SANITAIRE: 'Sanitaire',
  OUTILLAGE: 'Outillage',
  CARRELAGE: 'Carrelage',
  PHOTO: 'Photo',
};

/** Règles de service d'une filiale (`GET hub-app/product-analyzer/category-rules`). */
export type FilialeCategoryRules = {
  distributorId?: string;
  ignoreSupplierPrefix: boolean;
  rules: readonly { prefix: string; categoryType: CategoryTypeEnum }[];
  warehouses: readonly string[];
};

export type NegotiationCategoryRulesData = {
  items: FilialeCategoryRules[];
  defaultRules: readonly { prefix: string; categoryType: CategoryTypeEnum }[];
};

/** Règles de la filiale à laquelle appartient l'entrepôt (null si inconnue : jeu par défaut). */
export function filialeRulesForWarehouse(
  warehouse: string | null | undefined,
  data: NegotiationCategoryRulesData | null | undefined,
): FilialeCategoryRules | null {
  if (!warehouse || !data) return null;
  return data.items.find((f) => f.warehouses.includes(warehouse)) ?? null;
}

export type CategorySuggestion = { category: CategoryTypeEnum; prefix: string; label: string };

/**
 * Service suggéré d'après le code interne (eBatPro) : règles de la filiale (préfixe le plus long), sinon jeu par
 * défaut. Sans règles de filiale connues, comportement historique (1re lettre).
 */
export function suggestCategoryFromCode(
  codeEbat: string | null | undefined,
  filiale?: FilialeCategoryRules | null,
): CategorySuggestion | null {
  const hit = suggestCategoryFromRules(
    codeEbat,
    filiale?.rules.map((r) => ({ prefix: r.prefix, category: r.categoryType })),
    filiale?.ignoreSupplierPrefix ?? true,
  );
  if (!hit) return null;
  return { category: hit.category, prefix: hit.prefix, label: SERVICE_LABEL[hit.category] ?? hit.category };
}

/** Raccourci : suggestion pour un article, selon l'entrepôt qui porte le code. */
export function suggestCategoryForItem(
  item: { codeEbat?: string | null; warehouse?: string | null },
  data: NegotiationCategoryRulesData | null | undefined,
): CategorySuggestion | null {
  return suggestCategoryFromCode(item.codeEbat, filialeRulesForWarehouse(item.warehouse, data));
}

export type CountryPricing = {
  country: NegotiationCountry;
  priceTTC: number;
  pvHT: number;
  carrierCostHT: number | null;
  vatRate: number;
};

export function computeTargetBuyPrice(
  pvHT: number,
  carrierCostHT: number | null,
  marginPct: number,
): number {
  const gross = pvHT * (1 - AMAZON_TOTAL_TAKE_RATE - marginPct / 100);
  const port = carrierCostHT ?? 0;
  return Math.round((gross - port) * 100) / 100;
}

export function getCountryPricing(
  item: NegotiationDialogItem,
  country: NegotiationCountry,
): CountryPricing | null {
  const v = item.viabilityByCountry?.[country];
  if (v?.sourcePriceTTC == null || v.sourcePriceTTC <= 0) return null;
  const vatRate =
    v.vatRate != null && v.vatRate > 0 ? (v.vatRate > 1 ? v.vatRate - 1 : v.vatRate) : VAT_RATE_DEFAULT;
  const pvHT = v.pvHT != null && v.pvHT > 0 ? v.pvHT : v.sourcePriceTTC / (1 + vatRate);
  const carrierCostHT =
    v.carrierCostHT != null && Number.isFinite(v.carrierCostHT) ? v.carrierCostHT : null;
  return { country, priceTTC: v.sourcePriceTTC, pvHT, carrierCostHT, vatRate };
}

export function getBestCountryPricing(
  item: NegotiationDialogItem,
  marginPct: number,
): CountryPricing | null {
  let best: (CountryPricing & { paHTTarget: number }) | null = null;

  for (const country of ALL_NEGO_COUNTRIES) {
    const cp = getCountryPricing(item, country);
    if (!cp) continue;
    const paHTTarget = computeTargetBuyPrice(cp.pvHT, cp.carrierCostHT, marginPct);
    if (paHTTarget <= 0) continue;
    if (!best || paHTTarget < best.paHTTarget) {
      best = { ...cp, paHTTarget };
    }
  }

  if (best) {
    const { paHTTarget: _drop, ...pricing } = best;
    return pricing;
  }

  if (item.marketplaceEntries?.length) {
    for (const e of item.marketplaceEntries) {
      if (e.platform === 'AMAZON' && Number.isFinite(e.priceTTC) && e.priceTTC > 0) {
        const pvHT = e.priceTTC / (1 + VAT_RATE_FR);
        return { country: 'FR', priceTTC: e.priceTTC, pvHT, carrierCostHT: null, vatRate: VAT_RATE_FR };
      }
    }
  }
  return null;
}

export function formatCountryRef(cp: CountryPricing): string {
  const flag = NEGO_COUNTRY_FLAG[cp.country];
  const port = cp.carrierCostHT != null ? ` · port ${cp.carrierCostHT.toFixed(2)} €` : ' · port indisponible';
  return `${flag} Amazon ${cp.country} (${cp.priceTTC.toFixed(2)} € TTC · PV HT ${cp.pvHT.toFixed(2)} €${port})`;
}

export type PriceSuggestionKind = 'target' | 'pa_discount' | 'recommended' | 'fallback_85';

export type PriceSuggestion = {
  value: number;
  label: string;
  kind: PriceSuggestionKind;
};

export function suggestPriceFor(item: NegotiationDialogItem, marginPct: number): PriceSuggestion | null {
  const ref = getBestCountryPricing(item, marginPct);
  if (ref) {
    const paHTTarget = computeTargetBuyPrice(ref.pvHT, ref.carrierCostHT, marginPct);
    const currentPA = item.customerPriceHT;
    const countryRef = formatCountryRef(ref);

    if (paHTTarget > 0) {
      if (currentPA != null && currentPA > 0 && currentPA < paHTTarget) {
        const paHTNego = Math.round(currentPA * (1 - marginPct / 100) * 100) / 100;
        return {
          value: paHTNego,
          kind: 'pa_discount',
          label: `−${marginPct}% sur PA actuel (${currentPA.toFixed(2)} €) — PA déjà sous cible · Réf. ${countryRef}`,
        };
      }
      return {
        value: paHTTarget,
        kind: 'target',
        label: `Marge ${marginPct} % · comm. 15 % (×1,03) — pays le plus avantageux · Réf. ${countryRef}`,
      };
    }
  }
  if (item.recommendedBuyPrice != null && item.recommendedBuyPrice > 0) {
    return {
      value: Number(item.recommendedBuyPrice.toFixed(2)),
      kind: 'recommended',
      label: `Prix recommandé (IA) — ${item.recommendedBuyPrice.toFixed(2)} € HT (Amazon FR indisponible)`,
    };
  }
  if (item.customerPriceHT != null && item.customerPriceHT > 0) {
    return {
      value: Number((item.customerPriceHT * 0.85).toFixed(2)),
      kind: 'fallback_85',
      label: `85% du PA client (PA = ${item.customerPriceHT.toFixed(2)} €) — Amazon FR indisponible`,
    };
  }
  return null;
}

export function clampMarginPct(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_TARGET_MARGIN_PCT;
  return Math.min(30, Math.max(0, Math.round(raw * 10) / 10));
}
