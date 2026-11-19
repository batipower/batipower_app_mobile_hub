/**
 * Prix et marketplaces d'une fiche produit HUB (`GET hub-app/products/:reference/pricing`,
 * SUPERADMIN + MANAGER), repris de `front_externe_batipower/lib/types/hub-products.ts`. Les
 * actions d'écriture (`hub-app/products/:reference/marketplaces/*`) sont réservées au SUPERADMIN.
 */

export type HubMarketplaceKey =
  'amazon' | 'manoMano' | 'leroyMerlin' | 'castorama' | 'bricoman' | 'cdiscount';

export interface HubMarketplaceCountryPrice {
  HT: number;
  TTC: number;
}

export interface HubBuyboxRentability {
  isProfitable: boolean | null;
  margeHT: number | null;
  tauxMarge?: number | null;
  rentabiliteNette?: number | null;
  carrierCostHT?: number | null;
  shippingCostHT?: number | null;
  totalRevenueHT?: number | null;
  [key: string]: unknown;
}

export interface HubBuyboxCompetitor {
  sellerName?: string | null;
  priceTTC?: number | null;
  shippingCostTTC?: number | null;
  deliveryDaysMin?: number | null;
  deliveryDaysMax?: number | null;
  deliveryDaysOrigin?: string | null;
  [key: string]: unknown;
}

export interface HubBuyboxData {
  price?: number | string | null;
  shippingCostTTC?: number | null;
  /** Objet calculé côté back (marge, statut), jamais un simple nombre. */
  rentability?: HubBuyboxRentability | null;
  sellerName?: string | null;
  productUrl?: string | null;
  /** Amazon stocke l'URL de la fiche sous `url`, les autres sous `productUrl`. */
  url?: string | null;
  manomanoexpress?: boolean | null;
  firstCompetitor?: HubBuyboxCompetitor | null;
  /** Vendeur le plus rapide (Amazon uniquement). */
  fastestSeller?: HubBuyboxCompetitor | null;
  deliveryDaysMin?: number | null;
  deliveryDaysMax?: number | null;
  deliveryDaysOrigin?: string | null;
  customerRating?: number | null;
  reviewCount?: number | null;
  capturedAt?: string | null;
  [key: string]: unknown;
}

export interface HubMarketplacePricingBlock {
  actual: number | string | null;
  isOwner: boolean | null;
  buybox: HubBuyboxData | null;
  buyboxByCountry?: Record<string, HubBuyboxData> | null;
  actualByCountry?: Record<
    string,
    { priceTTC?: number | null; isOwner?: boolean; sellerName?: string | null; noBuyBox?: boolean }
  > | null;
  notAvailable: boolean | null;
  notAvailableByCountry?: Record<string, boolean> | null;
  sku?: string | null;
  sku2?: string | null;
  sku3?: string | null;
  skuByCountry?: Record<string, string> | null;
  skuInternal?: string | null;
  skuInternalByCountry?: Record<string, string> | null;
  monitor?: boolean;
  monitorByCountry?: Record<string, boolean> | null;
  maxSalesPerWeek?: number | null;
  sellerName?: string | null;
  creationRequested?: boolean;
  creationRequestedByCountry?: Record<string, boolean> | null;
}

/** `GET hub-app/products/:reference/pricing` */
export interface HubProductPricing {
  uuid: string;
  reference: string;
  fixPriceHT: number | null;
  malusTransportHT: number | null;
  costCarrierHT: number | Record<string, number> | null;
  weightInGrams: number | null;
  nbPieceByColis?: number | null;
  supplierQuantityMultiplier: number | null;
  supplierQuantityMultiplierFlevy: number | null;
  purchasePriceFlevyHT: number | null;
  ecotaxFlevyHT: number | null;
  purchasePriceDombasleHT: number | null;
  ecotaxDombasleHT: number | null;
  rentabilityRates: {
    amazon: number | null;
    manoMano: number | null;
    manoManoByCountry: Record<string, number> | null;
    leroyMerlin: number | null;
    bricoman: number | null;
    castorama: number | null;
    cdiscount: number | null;
  };
  equilibrium: {
    amazon: number | null;
    amazonByCountry: Record<string, HubMarketplaceCountryPrice> | null;
    manoMano: number | null;
    manoManoByCountry: Record<string, HubMarketplaceCountryPrice> | null;
    cdiscount: number | null;
    leroyMerlin: number | null;
    bricoman: number | null;
    castorama: number | null;
  };
  targets: {
    amazon: number | null;
    amazonByCountry: Record<string, number> | null;
    manoMano: number | null;
    manoManoByCountry: Record<string, number> | null;
    cdiscount: number | null;
    leroyMerlin: number | null;
    bricoman: number | null;
    castorama: number | null;
  };
  marketplaces: Record<HubMarketplaceKey, HubMarketplacePricingBlock>;
}

/** Enveloppe de réponse des actions marketplace. */
export interface HubEnvelope<T = unknown> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface HubLinkEanPayload {
  dryRun?: boolean;
  country?: string;
}

export interface HubCreateOfferPayload {
  priceTTC?: number;
  quantity?: number;
  countries?: string[];
}

export interface HubUpdateOfferPayload {
  priceTTC?: number;
  quantity?: number;
  country?: string;
}

export interface HubDeployAsinPayload {
  asin?: string;
  priceTTC?: number;
  quantity?: number;
  skuStrategy?: 'auto' | 'same' | 'new';
  dryRun?: boolean;
  /** Crée l'offre même si un ASIN est déjà lié à la fiche. */
  force?: boolean;
}

/** Diagnostic (dry-run) de `POST .../marketplaces/amazon/offers/asin/preview`. */
export interface HubAsinPreview {
  success?: boolean;
  message?: string;
  asin?: string | null;
  asinSource?: 'manual' | 'staging';
  amazonTitle?: string | null;
  stagingBuyboxPriceTTC?: number | null;
  stagingBuyboxSeller?: string | null;
  currentAsinOnSku?: string | null;
  currentListingStatus?: string[] | null;
  asinMismatch?: boolean;
  linkedAsins?: string[];
  skuCandidates?: { same: string; new: string };
  priceTTC?: number | null;
  quantity?: number;
  warnings?: string[];
}
