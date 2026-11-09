/**
 * Réponses de `hub-app/brand-margin` (page « Marges marques »). Contrat repris de
 * `front_externe_batipower/lib/types/hub-pricing.ts` et `hub-brand-margin.ts`. Montants en euros HT,
 * taux en %.
 */

export type HubBrandMarginSavCause =
  | 'HANDLING_RESTRICTION'
  | 'BAD_TRANSPORT'
  | 'TECHNICAL_FAILURE'
  | 'CARRIER_DISPUTE'
  | 'CUSTOMER_RETURN'
  | 'FULL_LOSS'
  | 'UNQUALIFIED'
  | 'RESEND';

/**
 * Marge « actuelle » : les unités vendues sur la période revalorisées au prix de vente actuel du canal
 * et au prix d'achat actuel (commission au même taux, transport réel). Seules les lignes dont les prix
 * actuels sont connus sont comptées (`coveredUnits` sur `units`).
 */
export interface HubBrandMarginCurrentFigures {
  caHT: number;
  /** Marge sans SAV (annulations déduites). */
  grossMarginHT: number;
  grossMarginRate: number | null;
  /** Marge actuelle moins l'impact SAV réel de la période, sur le CA actuel. */
  netMarginRate: number | null;
  coveredUnits: number;
}

/** Chiffres de marge d'un périmètre (marque, marketplace, total). */
export interface HubBrandMarginFigures {
  caHT: number;
  purchasesHT: number;
  transportHT: number;
  commissionsHT: number;
  quoteAdjustmentHT: number;
  /** Avoirs d'annulation : déduits dans les deux vues. */
  cancellationsHT: number;
  /** Marge sans SAV. */
  grossMarginHT: number;
  grossMarginRate: number | null;
  sav: {
    creditSlipsHT: number;
    /** Avoirs des retours client revendables (rentrée de stock) : informatif, hors impact SAV. */
    resellableReturnsHT?: number;
    /** Valeur d'achat des produits remis en stock (coût récupéré). */
    restockRecoveredHT: number;
    resendCostHT: number;
    /** Avoirs - remises en stock + renvois. */
    totalHT: number;
    byCause: Partial<Record<HubBrandMarginSavCause, number>>;
  };
  /** Marge avec SAV. */
  netMarginHT: number;
  netMarginRate: number | null;
  /** Taux de marge actuel ; `null` si aucune ligne valorisable, absent d'une API plus ancienne. */
  current?: HubBrandMarginCurrentFigures | null;
  units: number;
  orders: number;
}

export type HubBrandMarginOriginFigures = { origin: string } & HubBrandMarginFigures;

/**
 * Marge catalogue du site : produits actuellement en ligne sur batipower.fr, à leur prix site actuel
 * et prix d'achat actuel (sans transport ni commission, indépendante de la période).
 */
export interface HubBrandMarginSiteFigures {
  marginRate: number | null;
  /** Somme des prix site HT des produits valorisés. */
  caHT: number;
  marginHT: number;
  /** Produits en ligne valorisés. */
  products: number;
  /** Produits en ligne sans prix site ou sans prix d'achat. */
  excluded: number;
}

export interface HubBrandMarginBrand {
  brand: string;
  totals: HubBrandMarginFigures;
  byOrigin: HubBrandMarginOriginFigures[];
  /** Absent d'une API plus ancienne. */
  site?: HubBrandMarginSiteFigures | null;
}

/** `GET hub-app/brand-margin` : toutes les marques sur la période. */
export interface HubBrandMarginNeutralizedCancellations {
  orders: number;
  /** CA HT des commandes neutralisées (exclu des chiffres de marge). */
  caHT: number;
}

/** Réserves de couverture du calcul (pied de page des écrans). */
export interface HubBrandMarginCoverage {
  incompleteOrders: number;
  unattributedSlipsHT: number;
  /** Avoirs au-delà du montant payé de leur commande (doublons), ignorés. */
  excessSlipsHT?: number;
  /** Commandes avec une annulation validée : sorties du calcul (CA, coûts et SAV à 0). */
  neutralizedCancellations?: HubBrandMarginNeutralizedCancellations;
}

export interface HubBrandMarginOverview {
  period: { from: string; to: string };
  productCount: number;
  totals: HubBrandMarginFigures;
  byOrigin: HubBrandMarginOriginFigures[];
  brands: HubBrandMarginBrand[];
  /** Marge catalogue du site, toutes marques. */
  site?: HubBrandMarginSiteFigures | null;
  coverage: HubBrandMarginCoverage;
}

export type HubBrandMarginMonthly = { month: string } & HubBrandMarginFigures;

/** Taux de marge site d'un produit en ligne : prix site HT actuel face au prix d'achat HT actuel. */
export interface HubBrandMarginSiteProduct {
  /** `null` : prix site ou prix d'achat manquant. */
  marginRate: number | null;
  priceHT: number | null;
  purchaseHT: number | null;
}

/** Monitoring par pays et contraintes d'expédition marketplace d'un produit. */
export interface HubBrandMarginProductTraits {
  /** Pays où le repricing Amazon est actif (FR, BE, ES, IT, DE). */
  amazonCountries: string[];
  /** Pays où le repricing ManoMano est actif (FR, ES, IT). */
  manoManoCountries: string[];
  tooVoluminous: boolean;
  tooFragile: boolean;
}

export type HubBrandMarginProduct = {
  reference: string;
  designation: string | null;
  /** Taux de marge site ; `null` : produit pas en ligne ; absent : API pas à jour. */
  site?: HubBrandMarginSiteProduct | null;
  /** Absent d'une API pas à jour ou si la fiche est introuvable. */
  traits?: HubBrandMarginProductTraits | null;
} & HubBrandMarginFigures;

/** Marge d'une commande sur le périmètre de la marque (lignes des autres marques exclues). */
export type HubBrandMarginOrder = {
  reference: string;
  /** ISO 8601 (UTC). */
  createdAt: string;
  origin: string;
  negativeMargin: boolean;
  /** Prix d'achat, poids ou grille de transport manquant : marge estimée. */
  incomplete: boolean;
  /** Lignes de la marque vendues sous leur prix d'achat. */
  lossMakingLines: number;
} & HubBrandMarginFigures;

/** `GET hub-app/brand-margin/brand` : détail d'une marque. */
export interface HubBrandMarginDetail {
  period: { from: string; to: string };
  brand: string;
  /** Marketplace filtrée (`null` = toutes). */
  origin: string | null;
  totals: HubBrandMarginFigures;
  /** Marge catalogue du site de la marque, indépendante de la période et du canal. */
  site?: HubBrandMarginSiteFigures | null;
  /** Ventilation par marketplace de la marque, jamais filtrée. */
  byOrigin: HubBrandMarginOriginFigures[];
  monthly: HubBrandMarginMonthly[];
  products: HubBrandMarginProduct[];
  /** Pires commandes (marge nette croissante), tronquées par l'API. */
  orders: HubBrandMarginOrder[];
  ordersTotal: number;
  negativeOrders: number;
  incompleteOrders: number;
  /** Commandes au plus fort impact SAV (décroissant), tronquées par l'API. */
  savOrders: HubBrandMarginOrder[];
  savOrdersTotal: number;
  coverage: HubBrandMarginCoverage;
}

/** Une référence de la marque en stock au QG Batipower. */
export interface HubBrandStockQgLine {
  reference: string;
  designation: string | null;
  stock: number;
  /** Coût unitaire HT retenu ; `null` si aucun coût exploitable (valeur nulle). */
  unitCostHT: number | null;
  valueHT: number;
  /** `qg-average` : coût moyen pondéré du stock QG ; `fix-price` : repli sur le prix d'achat fixé. */
  costSource: 'qg-average' | 'fix-price' | 'none';
}

/** `GET hub-app/brand-margin/stock-qg` : stock QG d'une marque à l'instant t (hors période). */
export interface HubBrandStockQg {
  brand: string;
  valueHT: number;
  units: number;
  productsWithStock: number;
  unpricedProducts: number;
  unpricedUnits: number;
  /** Triées par valeur décroissante. */
  lines: HubBrandStockQgLine[];
  /** ISO 8601. */
  computedAt: string;
}
