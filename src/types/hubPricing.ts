/**
 * Types de la page Pricing du HUB, repris de `front_externe_batipower/lib/types/hub-pricing.ts`
 * (sans les types des exports Excel / Négo, absents du mobile).
 */

export type BuyBoxFilterState = 'all' | 'true' | 'false';

export type PricingMarketplaceKey =
  'amazon' | 'manoMano' | 'leroyMerlin' | 'castorama' | 'bricoman' | 'cdiscount';

export type PricingSortBy =
  | ''
  | 'previSalesByMonth'
  | 'monthlyPotential'
  | 'monthlyPotentialFR'
  | 'monthlyPotentialDE'
  | 'monthlyPotentialIT'
  | 'monthlyPotentialES'
  | 'monthlyPotentialUK'
  | 'forecast_FR'
  | 'forecast_DE'
  | 'forecast_IT'
  | 'forecast_ES'
  | 'forecast_UK'
  | 'lastMarketplaceDeployment'
  | 'salesHistory3m'
  | 'salesHistory6m'
  | 'salesHistory7m'
  | 'salesHistory12m'
  | 'returnsCount'
  /** Note de la fiche site (fiches non notées en dernier). */
  | 'qualityScore';

/** Type de retour (même classement que le back : `returns-classification.util.ts`). */
export type PricingReturnType =
  | 'TECHNICAL_FAILURE'
  | 'BAD_TRANSPORT'
  | 'BROKEN_OTHER'
  | 'NOT_RESELLABLE'
  | 'READY_TO_SELL'
  | 'UNVERIFIED';

/** Filtre / tri par type : un type précis, `BROKEN` (tout cassé) ou `ANY` (au moins un retour). */
export type PricingReturnTypeFilter = 'ANY' | 'BROKEN' | PricingReturnType;

export type MissedOpportunityMarketplace = '' | 'amazon' | 'manomano' | 'leroymerlin';
export type MissedOpportunityStock = '' | 'flevy' | 'dombasle' | 'qg';
export type BuyboxDangerStock = '' | 'both' | 'flevy' | 'dombasle' | 'qg' | 'all';
export type SupplierOrderFilter = '' | 'any' | 'FLEVY' | 'DOMBASLE';
export type WarehouseAffectation = '' | 'FLEVY' | 'DOMBASLE' | 'QG_BATIPOWER';
export type StockWarehouse = '' | 'FLEVY' | 'DOMBASLE' | 'QG_BATIPOWER';

/** Canaux de vente filtrables (valeurs de `OriginOrder`). `ALL` = vendu sur au moins un canal. */
export type SoldChannel =
  | 'WEBSITE'
  | 'AMAZON'
  | 'MANOMANO'
  | 'LEROY_MERLIN'
  | 'CASTORAMA'
  | 'CDISCOUNT'
  | 'BRICOMAN'
  | 'ALL';
export type SoldDays = 7 | 30 | 60 | 90 | 180 | 365;
export type SoldMode = 'with' | 'without';

export interface HubPricingMarketplaceSummary {
  actual: number | string | null;
  isOwner: boolean | null;
  hasSku: boolean;
  hasUrl: boolean;
  productUrl: string | null;
  targetPrice: number | null;
  equilibriumPrice: number | null;
  rentabilityRate: number | null;
  notAvailable: boolean;
  creationRequested: boolean;
  /** true si une donnée BuyBox a déjà été relevée au moins une fois sur cette marketplace. */
  buyboxRead: boolean;
}

export type HubPricingSiteQualityGrade = 'A' | 'B' | 'C' | 'D';

/** Note de la fiche produit du site (0-100) et son grade. */
export interface HubPricingSiteQuality {
  score: number;
  grade: HubPricingSiteQualityGrade;
}

export interface HubPricingRow {
  uuid: string;
  reference: string;
  batipowerId: number;
  brand: string | null;
  designation: string | null;
  thumbnailBase64: string | null;
  ean: string | null;
  codeFlevy: string | null;
  codeDombasle: string | null;
  categoryType: string | null;
  isActive: boolean;
  favorite: boolean;
  defaultAffectation: string;
  managedOnlyInQGbatipower: boolean;
  tooFragile: boolean;
  tooVoluminous: boolean;
  obsoletProduct: boolean;
  productTags: string[];
  stock: {
    flevy: number;
    dombasle: number;
    qg: number | null;
    deletedFlevy: boolean;
    deletedDombasle: boolean;
    depreciatedFlevy: boolean;
    depreciatedDombasle: boolean;
    multipleFlevy: number;
    multipleDombasle: number;
  };
  potential: {
    previSalesByMonth: number | null;
    monthly: Record<string, number> | null;
    daily: Record<string, number> | null;
    last7Days: number | null;
    last30Days: number | null;
    byCountry: Record<string, number> | null;
    monthlyByCountry: Record<string, Record<string, number>> | null;
    dailyByCountry: Record<string, Record<string, number>> | null;
    monthlyForecastByCountry: Record<string, { unitsSold30d?: number | null }> | null;
    byMarketplace: Record<string, number> | null;
    monthlyByMarketplace: Record<string, Record<string, number>> | null;
  };
  /** Retours par mois YYYY-MM (M-6 → M). Optionnel : API pas encore à jour. */
  returns?: {
    monthly: Record<string, number>;
    byType?: Partial<Record<PricingReturnType, number>>;
    monthlyByType?: Record<string, Partial<Record<PricingReturnType, number>>>;
  };
  transport: {
    malusTransportHT: number | null;
    costCarrierHT: number | Record<string, number> | null;
    weightInGrams: number | null;
  };
  purchase: {
    flevyHT: number | null;
    flevyEcotaxHT: number | null;
    dombasleHT: number | null;
    dombasleEcotaxHT: number | null;
  };
  fixPriceHT: number | null;
  website: {
    priceTTC: number | null;
  };
  monitorBuyBox: boolean;
  monitorBuyBoxByCountry: Record<string, boolean> | null;
  monitorBuyBoxManoManoByCountry: Record<string, boolean> | null;
  hasGoogleMerchant: boolean;
  /** Produit actif (déployé) sur le site Batipower. */
  websiteActive?: boolean;
  siteQuality?: HubPricingSiteQuality | null;
  hasActiveSupplierOrder: boolean;
  marketplaces: Record<PricingMarketplaceKey, HubPricingMarketplaceSummary>;
  lastCalculated: string;
  updatedAt: string;
  createdAt?: string;
}

export interface HubPricingPage {
  data: HubPricingRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface HubPricingBrandsResponse {
  brands: string[];
  total: number;
}

export interface HubPricingTagsResponse {
  tags: string[];
  total: number;
}

export interface HubPricingAffaireOption {
  uuid: string;
  name: string;
}

export type HubPricingSelectionStatsMonths = 3 | 6 | 12;

export interface HubPricingSelectionPurchases {
  purchasesDombasleHT: number;
  purchasesFlevyHT: number;
  purchasesHT: number;
}

export interface HubPricingSelectionStatsTotals extends HubPricingSelectionPurchases {
  from: string;
  to: string;
  caTTC: number;
  caHT: number;
  quantity: number;
  orders: number;
}

export interface HubPricingSelectionStatsPoint extends HubPricingSelectionPurchases {
  key: string;
  label: string;
  period: 'current' | 'previous';
  caTTC: number;
  caHT: number;
  quantity: number;
  orders: number;
}

export interface HubPricingSelectionStats {
  productCount: number;
  months: HubPricingSelectionStatsMonths;
  current: HubPricingSelectionStatsTotals;
  previous: HubPricingSelectionStatsTotals;
  series: HubPricingSelectionStatsPoint[];
  purchasesUnpricedQuantity: number;
}

/** Valorisation du stock QG (stock × fixPriceHT) de la sélection filtrée. */
export interface HubPricingStockValuation {
  valueHT: number;
  units: number;
  productsWithStock: number;
  /** Références en stock sans fixPriceHT (exclues de `valueHT`). */
  unpricedProducts: number;
  unpricedUnits: number;
  computedAt: string;
}

/** Agrégat de ventes de la période courante + valeurs de la période précédente (N-1). */
export interface HubPricingInsightMetrics {
  caHT: number;
  quantity: number;
  orders: number;
  previousCaHT: number;
  previousQuantity: number;
  previousOrders: number;
}

export interface HubPricingInsightCountry extends HubPricingInsightMetrics {
  /** ISO alpha-2 (`GB` pour le Royaume-Uni) ou `OTHER`. */
  code: string;
  name: string;
}

export interface HubPricingInsightChannel extends HubPricingInsightMetrics {
  code: string;
  name: string;
}

export interface HubPricingInsightProduct extends HubPricingInsightMetrics {
  reference: string;
  designation: string | null;
  brand: string | null;
}

export interface HubPricingInsightBrand extends HubPricingInsightMetrics {
  brand: string;
}

/** Point mensuel des ventes du site Batipower (période courante ou N-1). */
export interface HubPricingSiteMonthlyPoint {
  key: string;
  label: string;
  period: 'current' | 'previous';
  caHT: number;
  quantity: number;
  orders: number;
}

/** Analyse dédiée aux commandes d'origine `WEBSITE` (site Batipower) de la sélection. */
export interface HubPricingSiteInsights {
  summary: HubPricingInsightMetrics;
  monthly: HubPricingSiteMonthlyPoint[];
  byCountry: HubPricingInsightCountry[];
  topProducts: HubPricingInsightProduct[];
}

export interface HubPricingSelectionInsights {
  productCount: number;
  months: HubPricingSelectionStatsMonths;
  byCountry: HubPricingInsightCountry[];
  byChannel: HubPricingInsightChannel[];
  /** Optionnel : absent tant que le back n'est pas à jour. */
  site?: HubPricingSiteInsights;
  /** Points de la carte web : non utilisés sur mobile (la géographie est une liste). */
  pins?: unknown[];
  topProducts: HubPricingInsightProduct[];
  topBrands: HubPricingInsightBrand[];
  ordersWithoutCoordinates: number;
  ordersWithoutCountry: number;
}

export interface HubPricingFilters {
  search: string;
  brands: string[];
  categoryTypes: string[];
  warehouse: WarehouseAffectation;
  favorite: boolean | null;
  monitorBuyBox: boolean | null;
  hasInternalStock: boolean | null;
  hasStock: boolean | null;
  stockWarehouse: StockWarehouse;
  hasActiveSupplierOrder: SupplierOrderFilter;
  handlingRestricted: boolean | null;
  obsoletProduct: boolean | null;
  productTags: string[];
  sellingAtLoss: boolean;
  hasGoogleMerchant: boolean | null;
  /** Ne garder que les produits pas encore déployés (inactifs) sur le site Batipower. */
  notOnWebsite: boolean;
  affaireId: string;
  buyBoxAmazon: BuyBoxFilterState;
  buyBoxManoMano: BuyBoxFilterState;
  buyBoxLeroyMerlin: BuyBoxFilterState;
  buyBoxCastorama: BuyBoxFilterState;
  depreciatedFlevy: BuyBoxFilterState;
  depreciatedDombasle: BuyBoxFilterState;
  missedOpportunity: MissedOpportunityMarketplace;
  missedOpportunityStock: MissedOpportunityStock;
  buyboxToRemoveStock: BuyboxDangerStock;
  minStock: number | null;
  /** Filtre « ventes par canal » : actif si canal ET durée sont renseignés. */
  soldChannel: SoldChannel | '';
  soldDays: SoldDays | null;
  soldMode: SoldMode;
  /** Filtre « type de retour » (aussi le type utilisé par le tri `returnsCount`). */
  returnType: PricingReturnTypeFilter | '';
  sortBy: PricingSortBy;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

/** Champs modifiables depuis le mobile via `PATCH hub-app/products/:reference`. */
export interface UpdateHubProductPayload {
  fixPriceHT?: number | null;
  previSalesByMonth?: number | null;
  targetPriceAmazon?: number | null;
  targetPriceManoMano?: number | null;
  targetPriceLeroyMerlin?: number | null;
  targetPriceCastorama?: number | null;
  targetPriceBricoman?: number | null;
  productTags?: string[];
  favorite?: boolean;
  monitorBuyBox?: boolean;
  monitorBuyBoxByCountry?: Record<string, boolean> | null;
  monitorBuyBoxManoManoByCountry?: Record<string, boolean> | null;
}
