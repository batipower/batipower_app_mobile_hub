import type {
  HubBuyboxData,
  HubBuyboxRentability,
  HubMarketplaceKey,
  HubMarketplacePricingBlock,
  HubProductPricing,
} from '@/types/hubProductMarketplaces';

import { readBuyboxDetails, type BuyboxDetails } from './buyboxDetails';
import {
  DEFAULT_COMMISSION,
  getVatRate,
  marketplaceConfig,
  type MarketplaceConfigEntry,
} from './config';
import { resolveMarketplaceProductUrl } from './links';

/**
 * Vue normalisée d'une marketplace, port de `buildMarketplaceViewModel` du web
 * (`lib/hub/product-sheet/marketplaces.ts`) : les champs bruts d'ApproRows (France à plat, autres
 * pays dans des blobs `*ByCountry`) deviennent une vue uniforme par pays. Lecture seule.
 */
export interface MarketplaceCountryView {
  country: string;
  /** Notre prix TTC affiché sur la marketplace ; `null` sans offre. */
  actualPrice: number | null;
  isOwner: boolean | null;
  noBuyBox: boolean;
  targetPriceHT: number | null;
  equilibriumHT: number | null;
  equilibriumTTC: number | null;
  notAvailable: boolean | null;
  sellerName: string | null;
  margeHT: number | null;
  tauxMarge: number | null;
  isProfitable: boolean | null;
  productUrl: string | null;
  details: BuyboxDetails;
  /** Taux de commission du produit en % (15 = 15 %), `null` si non renseigné. */
  commissionRate: number | null;
  sku: string | null;
  skus: string[];
  skuInternal: string | null;
}

export interface MarketplaceViewModel {
  config: MarketplaceConfigEntry;
  block: HubMarketplacePricingBlock;
  countries: MarketplaceCountryView[];
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : (value as number);
  return typeof num === 'number' && Number.isFinite(num) ? num : null;
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && value.trim() !== '-' ? value.trim() : null;
}

function skuForCountry(block: HubMarketplacePricingBlock, country: string): string | null {
  if (country !== 'FR') {
    const countrySku = cleanText(block.skuByCountry?.[country]);
    if (countrySku) return countrySku;
  }
  return cleanText(block.sku);
}

function buyboxFor(block: HubMarketplacePricingBlock, country: string): HubBuyboxData | null {
  return (country === 'FR' ? block.buybox : block.buyboxByCountry?.[country]) ?? null;
}

function sellerForCountry(block: HubMarketplacePricingBlock, country: string): string | null {
  if (country === 'FR') return cleanText(block.buybox?.sellerName) ?? cleanText(block.sellerName);
  return (
    cleanText(block.actualByCountry?.[country]?.sellerName) ??
    cleanText(block.buyboxByCountry?.[country]?.sellerName)
  );
}

/** Taux de commission du produit en % (15 = 15 %), par pays pour ManoMano. */
export function commissionRate(
  pricing: HubProductPricing,
  key: HubMarketplaceKey,
  country: string,
): number | null {
  const rates = pricing.rentabilityRates;
  if (key === 'manoMano' && country !== 'FR') {
    return rates.manoManoByCountry?.[country] ?? rates.manoMano;
  }
  return rates[key];
}

/** Valeur de transport HT pour un pays (objet par pays ou valeur unique). */
function transportHT(cost: HubProductPricing['costCarrierHT'], country: string): number {
  if (cost == null) return 0;
  if (typeof cost === 'number') return cost;
  return cost[country] ?? cost.FR ?? Object.values(cost)[0] ?? 0;
}

/**
 * Marge nette d'une offre : pvHT = TTC / TVA, marge = pvHT × (1 − commission) − PA HT − transport HT.
 * Port de `computeBuyboxMargin` du web.
 */
export function computeMargin(params: {
  priceTTC: number;
  fixPriceHT: number | null;
  costCarrierHT: HubProductPricing['costCarrierHT'];
  /** Taux produit en % ; absent : commission par défaut de la marketplace. */
  rate: number | null;
  marketplace: HubMarketplaceKey;
  country: string;
}): { marginEur: number; marginPercent: number } | null {
  const { priceTTC, fixPriceHT, rate, marketplace } = params;
  if (!Number.isFinite(priceTTC) || priceTTC <= 0) return null;
  if (fixPriceHT == null || !Number.isFinite(fixPriceHT) || fixPriceHT <= 0) return null;
  // Amazon et ManoMano suivent le pays affiché ; les autres marketplaces sont vendues en France.
  const country = marketplace === 'amazon' || marketplace === 'manoMano' ? params.country : 'FR';
  const pvHT = priceTTC / getVatRate(country);
  if (!Number.isFinite(pvHT) || pvHT <= 0) return null;
  const commission =
    rate != null && Number.isFinite(rate) && rate >= 0 ? rate / 100 : DEFAULT_COMMISSION[marketplace];
  const marginEur = pvHT * (1 - commission) - fixPriceHT - transportHT(params.costCarrierHT, country);
  return { marginEur, marginPercent: (marginEur / pvHT) * 100 };
}

function resolveMargin(args: {
  pricing: HubProductPricing;
  key: HubMarketplaceKey;
  country: string;
  priceTTC: number | null;
  rentability: HubBuyboxRentability | null;
  rate: number | null;
}): Pick<MarketplaceCountryView, 'margeHT' | 'tauxMarge' | 'isProfitable'> {
  const storedMarge = toNumberOrNull(args.rentability?.margeHT);
  const storedRate =
    toNumberOrNull(args.rentability?.tauxMarge) ?? toNumberOrNull(args.rentability?.rentabiliteNette);
  if (storedMarge != null) {
    const profitable =
      typeof args.rentability?.isProfitable === 'boolean' ? args.rentability.isProfitable : storedMarge > 0;
    return { margeHT: storedMarge, tauxMarge: storedRate, isProfitable: profitable };
  }
  if (args.priceTTC == null) return { margeHT: null, tauxMarge: null, isProfitable: null };
  const computed = computeMargin({
    priceTTC: args.priceTTC,
    fixPriceHT: args.pricing.fixPriceHT,
    costCarrierHT: args.pricing.costCarrierHT,
    rate: args.rate,
    marketplace: args.key,
    country: args.country,
  });
  if (!computed) return { margeHT: null, tauxMarge: null, isProfitable: null };
  return {
    margeHT: computed.marginEur,
    tauxMarge: computed.marginPercent,
    isProfitable: computed.marginEur > 0,
  };
}

function buildCountryView(
  pricing: HubProductPricing,
  key: HubMarketplaceKey,
  country: string,
  ean: string | null,
): MarketplaceCountryView {
  const block = pricing.marketplaces[key];
  const buybox = buyboxFor(block, country);
  const isFr = country === 'FR';
  const actualEntry = block.actualByCountry?.[country];
  const actualPrice = isFr ? toNumberOrNull(block.actual) : toNumberOrNull(actualEntry?.priceTTC);
  const equilibriumByCountry =
    key === 'amazon'
      ? pricing.equilibrium.amazonByCountry
      : key === 'manoMano'
        ? pricing.equilibrium.manoManoByCountry
        : null;
  const targetByCountry =
    key === 'amazon'
      ? pricing.targets.amazonByCountry
      : key === 'manoMano'
        ? pricing.targets.manoManoByCountry
        : null;
  const rentability = isFr ? (block.buybox?.rentability ?? null) : (buybox?.rentability ?? null);
  const rate = commissionRate(pricing, key, country);
  const sku = skuForCountry(block, country);
  const eq = equilibriumByCountry?.[country];

  return {
    country,
    actualPrice,
    isOwner: isFr ? block.isOwner : (actualEntry?.isOwner ?? null),
    noBuyBox: isFr ? !block.actual : (actualEntry?.noBuyBox ?? !actualEntry),
    targetPriceHT: toNumberOrNull(isFr ? pricing.targets[key] : targetByCountry?.[country]),
    equilibriumHT: isFr ? toNumberOrNull(pricing.equilibrium[key]) : (eq?.HT ?? null),
    equilibriumTTC: isFr ? null : (eq?.TTC ?? null),
    notAvailable: isFr ? (block.notAvailable ?? null) : (block.notAvailableByCountry?.[country] ?? null),
    sellerName: sellerForCountry(block, country),
    ...resolveMargin({ pricing, key, country, priceTTC: actualPrice, rentability, rate }),
    productUrl: resolveMarketplaceProductUrl({
      marketplace: key,
      country,
      sku,
      ean,
      storedUrl: cleanText(buybox?.productUrl) ?? cleanText(buybox?.url),
    }),
    details: readBuyboxDetails(buybox),
    commissionRate: rate,
    sku,
    skus: isFr
      ? [block.sku, block.sku2, block.sku3].flatMap((value) => cleanText(value) ?? [])
      : [sku].flatMap((value) => value ?? []),
    skuInternal: cleanText(isFr ? block.skuInternal : block.skuInternalByCountry?.[country]),
  };
}

export function buildMarketplaceViewModel(
  pricing: HubProductPricing,
  key: HubMarketplaceKey,
  ean: string | null,
): MarketplaceViewModel {
  const config = marketplaceConfig(key);
  return {
    config,
    block: pricing.marketplaces[key],
    countries: config.countries.map((country) => buildCountryView(pricing, key, country, ean)),
  };
}

/** Prix TTC proposé à la création d'une offre : prix d'équilibre TTC, sinon objectif (ou équilibre) HT × TVA. */
export function suggestOfferPriceTTC(country: MarketplaceCountryView): number | null {
  if (country.equilibriumTTC != null && country.equilibriumTTC > 0) {
    return Math.round(country.equilibriumTTC * 100) / 100;
  }
  const ht = country.targetPriceHT ?? country.equilibriumHT;
  if (ht == null || ht <= 0) return null;
  return Math.round(ht * getVatRate(country.country) * 100) / 100;
}

/**
 * Stock proposé par défaut à la création ou mise à jour d'une offre : stock Flévy brut plus la
 * quantité vendable depuis Dombasle (⌊stock / lot × 0,9⌋ quand le produit s'achète par lot).
 */
export function computeOfferStockPrefill(
  flevy: number | null | undefined,
  dombasle: number | null | undefined,
  supplierQuantityMultiplier: number | null | undefined,
): number {
  const flevyStock = Math.max(0, flevy ?? 0);
  const dombasleStock = Math.max(0, dombasle ?? 0);
  const mult =
    supplierQuantityMultiplier != null && supplierQuantityMultiplier > 1 ? supplierQuantityMultiplier : null;
  const dombasleSellable =
    dombasleStock <= 0 ? 0 : mult == null ? dombasleStock : Math.floor((dombasleStock / mult) * 0.9);
  return flevyStock + dombasleSellable;
}
