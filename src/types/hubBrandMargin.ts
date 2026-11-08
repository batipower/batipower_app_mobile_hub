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
  units: number;
  orders: number;
}

export type HubBrandMarginOriginFigures = { origin: string } & HubBrandMarginFigures;

export interface HubBrandMarginBrand {
  brand: string;
  totals: HubBrandMarginFigures;
  byOrigin: HubBrandMarginOriginFigures[];
}

/** `GET hub-app/brand-margin` : toutes les marques sur la période. */
export interface HubBrandMarginOverview {
  period: { from: string; to: string };
  productCount: number;
  totals: HubBrandMarginFigures;
  byOrigin: HubBrandMarginOriginFigures[];
  brands: HubBrandMarginBrand[];
  coverage: {
    incompleteOrders: number;
    unattributedSlipsHT: number;
  };
}

export type HubBrandMarginMonthly = { month: string } & HubBrandMarginFigures;

export type HubBrandMarginProduct = {
  reference: string;
  designation: string | null;
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
  coverage: {
    incompleteOrders: number;
    unattributedSlipsHT: number;
  };
}
