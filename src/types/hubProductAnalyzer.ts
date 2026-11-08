/**
 * Types du Product Analyzer, repris de `front_externe_batipower/lib/types/hub-product-analyzer.ts`.
 * Les types de l'API annexe (distributeurs, réserve, recherche) sont dans `@/api/hubProductAnalyzer`.
 */

export type StepStatus = 'running' | 'done' | 'skipped' | 'error' | 'waiting' | 'warning' | 'idle';
export type Warehouse = 'DOMBASLE' | 'FLEVY' | 'NICODEME';
export type StagingStatus = 'PENDING' | 'VALIDATED' | 'REJECTED' | 'LAUNCHED' | 'EBAT_NOT_FOUND';
export type WeightSource =
  | 'ebatpro'
  | 'amazon'
  | 'amazon_shipping'
  | 'amazon_specs'
  | 'amazon_description'
  | 'amazon_de'
  | 'amazon_it'
  | 'amazon_es'
  | 'spapi_catalog'
  | 'gemini_web'
  | 'operator'
  | 'unknown';
export type StockReadiness = 'STOCK_OK' | 'TRANSFER_NEARBY' | 'TRANSFER_OTHER' | 'ORDER_NEEDED';
export type ViabilityStatus = 'VIABLE' | 'NEGOTIABLE' | 'NOT_VIABLE';
export type ProductViabilityDegree = 'TOP_1' | 'TOP_2' | 'TOP_3' | 'TOP_4' | 'TOP_5' | 'TOP_6' | 'TOP_7';
export type StagingSourceMode = 'EBATPRO' | 'EAN_DIRECT';
export type ViabilityTab = 'viable' | 'negotiable' | 'not_viable' | 'all';
export type WeightMode = '' | 'pending' | 'filled';
export type ConditioningFilter = '' | 'multiple' | 'simple';
export type TriState = '' | 'true' | 'false';
export type AnalyzerView = 'analyze' | 'staging';

/** Type d'une demande d'un produit staging vers un fournisseur / entrepôt. */
export type NegotiationRequestKind = 'NEGO' | 'NEGO_ORIGIN' | 'DEP';

/**
 * Demande d'un produit staging par entrepôt / fournisseur demandé : négo en cours, négo d'origine d'une ligne
 * transférée, ou DEP posée sans ligne de négo (ex. négo DOMBASLE / AD puis DEP LILLE / NICODEME).
 */
export interface NegotiationRequest {
  kind: NegotiationRequestKind;
  warehouse: string | null;
  distributorId: string | null;
  distributorName: string | null;
  status: string | null;
  /** Prix négo demandé HT exposé (sur une ligne DEP : brut moins la remise DEP du fournisseur, 10 % par défaut, comme côté fournisseur) ; null pour une DEP sans ligne de négo. */
  requestedMinPriceHT: number | null;
  /** Prix brut saisi par l'opérateur (base de la modification). */
  requestedMinPriceBaseHT?: number | null;
  /** Remise DEP appliquée à `requestedMinPriceHT` (10 par défaut, réglable par fournisseur), null hors DEP. */
  depExtraDiscountPercent?: number | null;
  proposedPriceHT: number | null;
  opportunityUuid: string | null;
  createdAt: string | null;
}
export type SearchMode = 'ebatpro' | 'manufacturer' | 'batch' | 'ean_direct' | 'reserve' | 'reserve_destockage';
export type BatchStep = 'idle' | 'checking' | 'checked' | 'analyzing' | 'results';
export type BatchCheckStatus = 'analyzable' | 'blocked' | 'already_analyzed' | 'not_found' | 'error';
export type BuyBoxMarketplace =
  | 'AMAZON'
  | 'MANOMANO'
  | 'LEROY_MERLIN'
  | 'BRICOMAN'
  | 'CASTORAMA'
  | 'CDISCOUNT'
  | 'WEBSITE';
export type ViabilityCountry = 'FR' | 'DE' | 'IT' | 'ES' | 'UK';

export type StagingSortByApi =
  | 'lastAnalyzedAt'
  | 'createdAt'
  | 'marginPercent'
  | 'recommendedBuyPrice'
  | 'negotiationGapHT'
  | 'weightGrams'
  | 'monthlyPotential'
  | 'monthlyPotentialFR'
  | 'monthlyPotentialDE'
  | 'monthlyPotentialIT'
  | 'monthlyPotentialES'
  | 'monthlyPotentialUK'
  | 'viabilityDegree';

export interface AgencyStockDetail {
  code: string;
  name: string;
  quantity: number;
}

export interface StepData {
  step: string;
  status: StepStatus;
  label: string;
  data?: Record<string, unknown>;
}

export interface MarketplaceData {
  found: boolean;
  productId?: number | null;
  sku?: string | null;
  title?: string | null;
  brand?: string | null;
  category?: string | null;
  categoryCode?: string | null;
  categoryLabel?: string | null;
  imageUrl?: string | null;
  active?: boolean | null;
  customerRating?: number | null;
  reviewCount?: number | null;
  priceTTC?: number | null;
}

export interface CountryViability {
  country: ViabilityCountry;
  vatRate: number;
  pvHT: number;
  carrierCostHT: number;
  sourcePriceTTC: number;
  sourcePriceOrigin: 'amazon_buybox' | 'junglescout';
  isViable: boolean;
  viabilityStatus: ViabilityStatus;
  marginPercent: number;
  recommendedBuyPrice: number;
  negotiationGapHT: number;
}

export type ViabilityByCountry = Partial<Record<ViabilityCountry, CountryViability>>;

export interface FullResult {
  ebatpro: Record<string, unknown>;
  amazon: Record<string, unknown>;
  transport: Record<string, unknown>;
  salesAnalysis: Record<string, unknown>;
  targets: Record<string, unknown>;
  systemStatus: Record<string, unknown>;
  meta: Record<string, unknown>;
  manomano?: MarketplaceData;
  leroyMerlin?: MarketplaceData;
  castorama?: MarketplaceData;
  viabilityByCountry?: ViabilityByCountry;
  viabilityByWarehouse?: ViabilityByWarehouse;
}

export interface StagingMpSales {
  approximate30DayUnitsSold: number | null;
  approximate30DayRevenue: number | null;
}

export interface LaunchResponse {
  success: boolean;
  adopted?: boolean;
  batipowerId: number | null;
  reference?: string;
  message?: string;
}

export interface AffaireLink {
  uuid: string;
  warehouse: Warehouse;
  affaireId: string;
  affaireName: string;
  affaireStatus: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
}

export interface WarehouseViabilityCountry {
  country: ViabilityCountry;
  vatRate: number;
  pvHT: number;
  carrierCostHT: number;
  sourcePriceTTC: number;
  sourcePriceOrigin: 'amazon_buybox' | 'junglescout';
  marginPercent: number;
  recommendedBuyPrice: number;
  isViable: boolean;
  viabilityStatus: ViabilityStatus;
  negotiationGapHT: number;
}

export interface WarehouseViabilityGlobal {
  pvHT: number;
  carrierCostHT: number;
  marginPercent: number;
  recommendedBuyPrice: number;
  isViable: boolean;
  viabilityStatus: ViabilityStatus;
  negotiationGapHT: number;
}

export interface WarehouseViability {
  purchasePriceHT: number;
  global: WarehouseViabilityGlobal | null;
  byCountry: Partial<Record<ViabilityCountry, WarehouseViabilityCountry>>;
}

export type ViabilityByWarehouse = Partial<Record<Warehouse, WarehouseViability>>;

/** Offre d'un distributeur sur une analyse partagée (par EAN). */
export interface StagingDistributorOfferView {
  uuid: string;
  distributorId: string;
  distributor?: { id: string; name: string; slug: string } | null;
  warehouse?: Warehouse | null;
  /** Entrepôt racine du distributeur : une offre (et un code interne) par entrepôt. Absent = ligne historique. */
  distributorWarehouseId?: string | null;
  distributorWarehouse?: { id: string; name: string; code: string | null; warehouse: string | null } | null;
  distributorCode: string | null;
  purchasePriceHT: number | null;
  /** Unité de vente eBatPro de CE fournisseur (ex. « M2 », « U »). */
  saleUnit?: string | null;
  /** Conditionnement de vente brut (ex. 12 = vendu par 12). */
  salesPackaging?: number | null;
  /** Nombre de pièces à commander pour 1 unité vendue ; null = ×1. */
  conditioningMultiplier?: number | null;
  stockWarehouse?: number | null;
  stockTotal?: number | null;
  /** Disponibilité calculée sur le stock de cette offre. */
  stockReadiness?: StockReadiness | null;
  /** Agences de l'offre : `{ nearby, other }` (code, nom, quantité). */
  agencyStock?: { nearby?: AgencyStockDetail[] | null; other?: AgencyStockDetail[] | null } | null;
  plannedDep: boolean;
  track: 'STANDARD' | 'DISTRIBUTOR_CLEARANCE';
  clearancePriceHT?: number | null;
  normalPriceHT?: number | null;
  clearanceQuantity?: number | null;
  viability?: { global?: { marginPercent: number; viabilityStatus?: string | null } | null } | null;
}

/** Statut de la recherche du code interne eBatPro d'un produit chez un fournisseur / entrepôt. */
export type SupplierCodeStatus =
  | 'ATTACHED'
  | 'ALREADY_SET'
  | 'NOT_FOUND'
  | 'AMBIGUOUS'
  | 'CONFLICT'
  | 'NO_EBATPRO'
  | 'ERROR';

/** Référence eBatPro candidate quand l'EAN retourne plusieurs résultats chez un entrepôt. */
export interface SupplierCodeCandidate {
  code: string;
  name: string;
  brand: string;
  manufacturerSku: string;
  ean: string;
  purchasePriceHT: number | null;
  publicPriceHT: number | null;
  stocks: { warehouse: string; quantity: number; warehouseCode: string }[];
}

export interface SupplierCodeStock {
  stockWarehouse: number | null;
  stockTotal: number | null;
  /** Agences proches (disponibles à J+1). */
  nearby: AgencyStockDetail[];
  other: AgencyStockDetail[];
  readiness: StockReadiness | null;
}

/** Résultat de la recherche pour un fournisseur et un entrepôt (une ligne par compte eBatPro). */
export interface SupplierCodeResult {
  distributorId: string;
  distributorName: string;
  distributorWarehouseId: string;
  warehouseName: string;
  warehouse: string | null;
  status: SupplierCodeStatus;
  code?: string;
  purchasePriceHT?: number | null;
  candidates?: SupplierCodeCandidate[];
  conflictingStagingUuid?: string;
  message?: string;
  stock: SupplierCodeStock;
}

export interface SupplierCodesSearchResponse {
  stagingId: string;
  ean: string | null;
  /** `NO_EAN` : pas d'EAN, aucune recherche possible. */
  reason?: 'NO_EAN';
  suppliers: SupplierCodeResult[];
}

export interface StagingItem {
  uuid: string;
  createdAt: string;
  /** Dernière analyse (création ou relance du pipeline). Absent sur d'anciennes réponses : retomber sur `createdAt`. */
  lastAnalyzedAt?: string | null;
  codeEbat: string | null;
  warehouse: string | null;
  plannedDepWarehouse?: 'FLEVY' | 'DOMBASLE' | 'NICODEME' | null;
  /** Une offre par distributeur (code, PA, DEP planifié, voie). */
  distributorOffers?: StagingDistributorOfferView[];
  status: StagingStatus;
  designation: string | null;
  brand: string | null;
  ean: string | null;
  asin: string | null;
  buyboxSeller: string | null;
  isViable: boolean | null;
  viabilityStatus: ViabilityStatus | null;
  marginPercent: number | null;
  recommendedBuyPrice: number | null;
  customerPriceHT: number | null;
  customerPriceFlevyHT: number | null;
  customerPriceDombasleHT: number | null;
  negotiationGapHT: number | null;
  weightGrams: number | null;
  weightPending: boolean;
  stockWarehouse: number | null;
  stockTotal: number | null;
  stockNearbyAgencies: number | null;
  stockOtherAgencies: number | null;
  nearbyAgencyDetails: AgencyStockDetail[] | null;
  otherAgencyDetails: AgencyStockDetail[] | null;
  stockReadiness: StockReadiness | null;
  salesAnalysis?: Record<string, StagingMpSales> | null;
  manomano?: MarketplaceData | null;
  leroyMerlin?: MarketplaceData | null;
  castorama?: MarketplaceData | null;
  tooFragile: boolean;
  tooVoluminous: boolean;
  affaireId?: string | null;
  affaireLinks?: AffaireLink[];
  viabilityByCountry?: ViabilityByCountry | null;
  viabilityByWarehouse?: ViabilityByWarehouse | null;
  sourceMode?: StagingSourceMode | null;
  batipowerId?: number | null;
  viabilityDegree?: ProductViabilityDegree | null;
  /** Tags libres posés sur l'analyse (recopiés sur le produit catalogue au lancement). */
  tags?: string[] | null;
  monthlyPotentialFR?: number | null;
  publicPriceHT?: number | null;
  manufacturerSku?: string | null;
  saleUnit?: string | null;
  saleUnitFlevy?: string | null;
  saleUnitDombasle?: string | null;
  salesPackaging?: number | null;
  salesPackagingFlevy?: number | null;
  salesPackagingDombasle?: number | null;
  conditioningMultiplierFlevy?: number | null;
  conditioningMultiplierDombasle?: number | null;
  weightSource?: WeightSource | null;
  weightConfidence?: string | null;
  weightCrossCheck?: Record<string, unknown> | null;
  fullAnalysisSnapshot?: FullResult | null;
  /** Analyse forcée d'un produit déjà au catalogue : ligne de trace verrouillée (aucune action). */
  forcedFromCatalogue?: boolean;
  /** Produit déjà au catalogue (lancé, fiche liée ou trouvée par EAN / référence) : rattachement seul. */
  inCatalogue?: boolean;
  alreadyExistsInSystem?: boolean;
  existingApproRowsRef?: string | null;
  existingBatipowerId?: number | null;
}

export interface Affaire {
  uuid: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  /** Fournisseur de l'affaire : cloisonne les négos (null = affaire historique à renseigner). */
  distributorId?: string | null;
  distributorName?: string | null;
  createdAt: string;
  updatedAt: string;
  stagingCount: number;
  legacyStagingCount?: number;
}

export interface AffaireStats {
  affaireId: string;
  name: string;
  total: number;
  byStatus: Record<string, number>;
  byViability: Record<string, number>;
  byWarehouse?: Record<string, number>;
  /** Lignes de trace : produits déjà au catalogue analysés en forçant. */
  inCatalogueCount?: number;
  totalMonthlyPotential: number;
  totalMonthlyPotentialFR: number;
  avgMarginPercent: number | null;
}

export interface BlockedData {
  reason: string;
  message: string;
  existingRecord: {
    source: string;
    batipowerId: number | null;
    reference: string;
    isActive: boolean;
  };
}

export interface AlreadyAnalyzedData {
  reason: string;
  message: string;
  staging: {
    uuid: string;
    status: string;
    analysisCount: number;
    updatedAt: string;
    isViable: boolean | null;
  };
}

export interface AnalysisReusedData {
  jobId: string;
  reason: string;
  message: string;
  warehouse: Warehouse | null;
  purchasePriceHTRefreshed: number | null;
  canLinkEan?: boolean;
  staging: StagingItem;
}

export interface ManufacturerSearchResult {
  found: boolean;
  manufacturerRef: string;
  codeFlevy: string | null;
  codeDombasle: string | null;
  source: 'database' | 'ebatpro' | null;
  batipowerId?: number | null;
  reference?: string | null;
  error?: string;
}

export interface BatchItem {
  id: string;
  originalRef: string;
  resolvedCode: string | null;
  resolvedWarehouse: Warehouse | null;
  refType?: 'ebatpro' | 'ean';
  reserveUuid?: string | null;
  /** Distributeur du lot de destockage (voie DISTRIBUTOR_CLEARANCE). */
  distributorId?: string | null;
  /** Prix de destockage du fichier (PA de l'offre du distributeur). */
  estimatedBuyPriceHT?: number | null;
  /** Analyse forcée d'un produit déjà au catalogue (ligne de trace). */
  forceCatalogue?: boolean;
  status: 'pending' | 'analyzing' | 'done' | 'ebat_not_found' | 'error' | 'blocked';
  fullResult: FullResult | null;
  stagingId: string | null;
  errorMsg: string | null;
  elapsedMs: number;
}

export interface BatchCheckItem {
  ref: string;
  code: string | null;
  warehouse: Warehouse | null;
  refType?: 'ebatpro' | 'ean';
  reserveUuid?: string | null;
  /** Voie destockage : distributeur du lot et prix du fichier. */
  distributorId?: string | null;
  distributorName?: string | null;
  reserveTrack?: 'STANDARD' | 'DISTRIBUTOR_CLEARANCE' | null;
  clearancePriceHT?: number | null;
  checkStatus: BatchCheckStatus;
  message: string | null;
  existingStaging: {
    uuid: string;
    status: string;
    isViable: boolean | null;
    marginPercent: number | null;
    updatedAt: string;
  } | null;
  existingProduct: {
    source: string;
    batipowerId: number | null;
    reference: string;
    isActive: boolean;
  } | null;
  selected: boolean;
}

export interface MarketplaceEntry {
  uuid: string;
  createdAt: string;
  updatedAt: string;
  stagingId: string;
  platform: BuyBoxMarketplace;
  priceTTC: number;
  seller: string | null;
  customerRating: number | null;
  reviewCount: number | null;
  comments: string | null;
  viabilityScore: number | null;
  isViable: boolean | null;
  productUrl?: string | null;
}

export interface MarketplaceViabilityEntry extends MarketplaceEntry {
  marginPercent: number;
  canPosition: boolean;
}

export interface MarketplaceViabilityResult {
  stagingId: string;
  purchasePriceHT: number;
  transportCostHT: number;
  entries: MarketplaceViabilityEntry[];
  bestPlatform: BuyBoxMarketplace | null;
}

export interface StagingPage {
  items: StagingItem[];
  total?: number;
  count?: number;
  pagination?: { total?: number };
}

export interface StagingBrandsResponse {
  brands: string[];
}

export interface StagingFilters {
  view: AnalyzerView;
  status: StagingStatus | '';
  search: string;
  viability: ViabilityTab;
  country: ViabilityCountry | '';
  weight: WeightMode;
  hasNego: boolean;
  needsNego: boolean;
  sortBy: StagingSortByApi;
  sortOrder: 'asc' | 'desc';
  inStock: boolean;
  stockReadiness: StockReadiness | '';
  hasEan: TriState;
  hasAsin: TriState;
  hasEbat: TriState;
  minSales: boolean;
  minStockWh: string;
  /**
   * Fournisseurs auxquels rattacher les filtres stock : ils portent alors sur le stock de l'offre de
   * ces distributeurs (au moins un doit tout remplir) au lieu de l'entrepôt principal de l'analyse.
   */
  stockDistributorIds: string[];
  brands: string[];
  conditioning: ConditioningFilter;
  /** Tags produit (au moins un en commun). */
  tags: string[];
  affaire: boolean;
  affaireId: string;
  /** Distributeur : produits ayant une offre chez ce distributeur. */
  distributorId: string;
  /** Voie de l'offre (destockage distributeur / standard). */
  offerTrack: '' | 'STANDARD' | 'DISTRIBUTOR_CLEARANCE';
  /** Avec `distributorId` : offres sans code chez ce distributeur. */
  missingCode: boolean;
  page: number;
  limit: number;
  ean: string;
  staging: string;
  obtainedPriceHT: string;
  launchedFromOpportunityUuid: string;
  /** Uuid du staging ouvert dans le drawer de détail (vue liste) — n'affecte pas la requête de liste. */
  detail: string;
}

export interface ReserveItem {
  uuid: string;
  ean?: string | null;
  brand?: string | null;
  designation?: string | null;
  codeEbat?: string | null;
  warehouse?: Warehouse | null;
  status?: string;
  priority?: string;
}

export interface ReserveListResponse {
  items: ReserveItem[];
  total?: number;
  stats?: Record<string, number>;
}

export interface AnalyzerWsTicket {
  wsUrl: string;
  token?: string | null;
  status?: string;
}

export interface AnalyzerWsInputRequired {
  jobId: string;
  field: string;
  message?: string;
  timeoutMs?: number;
}
