/**
 * Types des fiches produit HUB, alignés sur `front_externe_batipower/lib/types/hub-products.ts`
 * (routes `hub-app/products/*`, réservées à SUPERADMIN et MANAGER).
 *
 * Les prix d'achat, marges et objectifs ne sont volontairement pas typés : l'app mobile
 * n'affiche aucune donnée financière.
 */

/** Résultat de `GET hub-app/products/search`. */
export interface HubProductSearchHit {
  reference: string;
  designation: string | null;
  brand: string | null;
  /** Champ qui a fait remonter le produit (référence, EAN, SKU, désignation…). */
  matchedOn: string;
  exact: boolean;
}

export interface HubSalesQuantities {
  last7Days?: number;
  last30Days?: number;
  totalQuantity?: number;
  /** Unités vendues par mois (`YYYY-MM`), alimenté par un cron : source de l'histogramme mensuel. */
  monthly?: Record<string, number>;
  /** Unités vendues par jour (`YYYY-MM-DD`) : repli quand un mois manque dans `monthly`. */
  daily?: Record<string, number>;
}

/** Prévision des ventes d'un pays (`monthlyForecastByCountry` de la fiche). */
export interface HubMonthlyForecastEntry {
  unitsSold30d?: number | null;
}

export interface HubProductFlags {
  obsoletProduct: boolean;
  tooFragile: boolean;
  tooVoluminous: boolean;
  isActive: boolean;
  /** Produit actif sur batipower.fr (statut PrestaShop). */
  websiteActive?: boolean;
  /** Stock affiché sur le site forcé à 0 : produit non commandable (stock réel inchangé). */
  siteStockForcedZero?: boolean;
  depreciatedFlevy: boolean;
  depreciatedDombasle: boolean;
}

/** `GET hub-app/products/:reference` */
export interface HubProductHeader {
  uuid: string;
  reference: string;
  designation: string | null;
  brand: string | null;
  codeFlevy: string | null;
  codeDombasle: string | null;
  /** Code interne chez Lille (Nicodème) ; absent avec un ancien back. */
  codeLille?: string | null;
  ean: string | null;
  categoryType: string | null;
  thumbnailBase64: string | null;
  weightInGrams: number | null;
  /** Pièces par colis ; `null` = 1 unité = 1 colis. Absent d'une API plus ancienne. */
  nbPieceByColis?: number | null;
  salesQuantities: HubSalesQuantities | null;
  /** Prévision mensuelle enregistrée sur la fiche (unités par mois). */
  previSalesByMonth?: number | null;
  monthlyForecastByCountry?: Record<string, HubMonthlyForecastEntry> | null;
  stock: { flevy: number | null; dombasle: number | null; qg: number | null };
  flags: HubProductFlags;
  updatedAt: string;
}

export interface HubWarehouseStock {
  stock: number | null;
  code?: string | null;
  lastInventoryAt?: string | null;
  lastInventorySuccess?: boolean | null;
  deleted?: boolean | null;
  depreciated?: boolean | null;
}

export interface HubAgencyStock {
  parentWarehouse: 'DOMBASLE' | 'FLEVY' | string;
  code: string;
  name: string;
  stock: number;
  /** Date du dernier inventaire de l'entrepôt parent (source du snapshot). */
  inventoryAt: string | null;
}

export interface HubSupplierOrder {
  id: string;
  reference: string;
  weekLabel: string;
  warehouse: string;
  commandeFournisseur: boolean;
  quantiteCommandee: number | null;
  dateLivraisonPrevue: string | null;
}

/** `GET hub-app/products/:reference/stock` */
export interface HubProductStock {
  reference: string;
  warehouses: {
    flevy: HubWarehouseStock;
    dombasle: HubWarehouseStock;
    qg: HubWarehouseStock;
  };
  /** Stock agences au dernier inventaire eBatPro (hors entrepôts principaux). */
  agencies: HubAgencyStock[];
  supplierOrders: HubSupplierOrder[];
  supplierOrdersWeekLabel: string | null;
}

// ─── Historique des ventes ───────────────────────────────────────────────────

/** Ventes d'un jour (`GET hub-app/products/:reference/sales/daily`). */
export interface HubSalesDailyPoint {
  /** `YYYY-MM-DD`. */
  date: string;
  quantity: number;
  /** CA TTC du jour ; absent pour le MANAGER (réponse assainie côté back). */
  amount?: number;
  ordersCount: number;
}

export interface HubSalesDailyResponse {
  reference: string;
  days: number;
  hasCachedData: boolean;
  points: HubSalesDailyPoint[];
}

export type HubStatsPeriod = '1month' | '3months' | '6months' | '1year';

export interface HubProductStatisticsMarketplace {
  marketplace: string;
  quantity: number;
  ordersCount: number;
  totalAmountTTC: number;
  averagePrice: number;
  priceMin: number;
  priceMax: number;
}

/** `GET hub-app/products/:reference/sales/statistics` : prix et volumes par marketplace. */
export interface HubProductStatisticsResponse {
  message: string;
  status: 'success' | 'no_data' | 'error';
  source?: 'cache' | 'realtime';
  reference: string;
  summary?: {
    totalQuantity: number;
    totalOrders: number;
    totalAmountTTC: number;
    averagePrice: number;
    priceMin: number;
    priceMax: number;
  };
  marketplaceStats?: HubProductStatisticsMarketplace[];
}
