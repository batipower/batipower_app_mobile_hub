/**
 * Types des commandes consultées depuis la recherche HUB, alignés sur
 * `front_externe_batipower/lib/api/hub-orders.ts` (routes `hub-app/orders/*`).
 *
 * Seuls les champs affichés par l'app mobile sont modélisés. Les données financières
 * (prix d'achat, rentabilité) ne sont typées que pour la page « Candidats palette »
 * (`HubOrder.rentability`…), seule à les afficher, derrière l'oeil de masquage.
 */

export interface HubCustomer {
  lastname: string | null;
  firstname: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  zipcode: string | null;
}

export interface HubShipping {
  noSuivi: string | null;
  warehouseAffectation: string | null;
  status: string | null;
  carrierName: string | null;
}

// ─── Recherche ───────────────────────────────────────────────────────────────

/** Résultat de `GET hub-app/orders/search-sav` (référence, téléphone, suivi, email, nom…). */
export interface HubSavOrder {
  uuid: string;
  reference: string;
  ebatRef: string | null;
  status: string;
  paymentStatus: string | null;
  origin: string | null;
  totalPaid: number | null;
  createdAt: string;
  customer: HubCustomer | null;
  shipping: HubShipping | null;
  /** Champs qui ont fait remonter la commande (`reference`, `phone`, `noSuivi`…). */
  matchedOn: string[];
}

export interface HubPagedResult {
  success: boolean;
  message: string;
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HubSavSearchResult extends HubPagedResult {
  searchTerm: string;
  matchedFields: string[];
  orders: HubSavOrder[];
}

export interface HubMatchedProduct {
  reference: string;
  name: string | null;
  quantity: number;
  productPrice: number;
}

/** Résultat de `GET hub-app/orders/search-by-product-reference`. */
export interface HubProductOrder {
  uuid: string;
  reference: string;
  ebatRef: string | null;
  status: string;
  paymentStatus: string | null;
  origin: string | null;
  totalPaid: number | null;
  createdAt: string;
  customer: HubCustomer | null;
  shipping: HubShipping | null;
  matchedProducts: HubMatchedProduct[];
}

/** Récap (hors aperçu) des commandes contenant le produit. */
export interface HubProductOrdersSummary {
  ordersCount: number;
  /** Quantité totale du produit sur toutes les commandes. */
  totalQuantity: number;
}

export interface HubOrdersByProductResult extends HubPagedResult {
  reference: string;
  orders: HubProductOrder[];
  summary?: HubProductOrdersSummary;
}

/** Commande telle qu'affichée dans une ligne de résultat, quelle que soit la voie de recherche. */
export interface OrderSearchHit {
  uuid: string;
  reference: string;
  status: string | null;
  origin: string | null;
  totalPaid: number | null;
  createdAt: string | null;
  customer: HubCustomer | null;
  shipping: HubShipping | null;
  matchedOn: string[];
  /** Trouvée parce qu'elle contient le produit recherché. */
  containsProduct: boolean;
}

// ─── Fiche commande (`logistics-detail`) ────────────────────────────────────

export interface HubOrderRow {
  uuid?: string;
  reference: string;
  name: string | null;
  quantity: number;
  productPrice: number;
}

export interface HubWarehouseOrder {
  status: string;
  doneStatus?: string | null;
  deliveryOrderStatus: string;
  noSuivi: string | null;
  warehouseAffectation: string | null;
  tags: string[];
  isSplitOrigin?: boolean;
  splitParentReference?: string | null;
  splitChildReferences?: string[];
}

export interface HubDeliveryAddress {
  lastname: string | null;
  firstname: string | null;
  address: string | null;
  zipcode: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
  country: string | null;
  complt_address: string | null;
}

export interface HubOrder {
  uuid: string;
  reference: string;
  ebatRef: string | null;
  status: string;
  paymentStatus: string | null;
  origin: string | null;
  totalPaid: number | null;
  totalProduct: number | null;
  totalShipping: number | null;
  emailToNotify: string | null;
  createdAt: string;
  dateDelivery: string | null;
  deliveredAt?: string | null;
  dateCollect: string | null;
  dateExpedie: string | null;
  shippedAt?: string | null;
  deliveryAddress: HubDeliveryAddress | null;
  rows: HubOrderRow[];
  warehouseOrder: HubWarehouseOrder | null;
  carrier: { name: string } | null;
  /** Statut du flux palette (`CANDIDATE`, `QUOTE_REQUESTED`, `ACCEPTED`, `REFUSED`), null = flux classique. */
  palletFlowStatus?: string | null;
  /** Entrepôt « naturel » de la commande, avant son parking QG pour le flux palette. */
  palletNaturalWarehouse?: string | null;
  /**
   * Marges (€ HT) et coût transport, renvoyés au seul SUPERADMIN. Utilisés uniquement par la page
   * « Candidats palette » (derrière l'oeil de masquage), jamais par la fiche commande.
   */
  rentability?: number | null;
  rentabilityRealWithOurPrice?: number | null;
  carrierCostHT?: number | null;
}

/** Commande du même split manuel ou du même panier site (la commande courante incluse). */
export interface HubRelatedOrder {
  reference: string;
  ebatRef: string | null;
  /** SPLIT = split manuel, PS_SIBLING = panier scindé par PrestaShop, RESEND = renvoi client. */
  kind: 'SPLIT' | 'PS_SIBLING' | 'RESEND';
  isCurrent: boolean;
  /** Niveau dans l'arbre de split (0 = racine). */
  depth: number;
  status: string;
  paymentStatus: string | null;
  carrierName: string | null;
  noSuivi: string | null;
  totalPaid: number | null;
  createdAt: string;
}

export interface HubReturnLabel {
  uuid: string;
  createdAt: string;
  noSuivi: string;
  status: string;
  parcelIndex: number;
  parcelCount: number;
}

export interface HubCarrierDispute {
  uuid: string;
  createdAt: string;
  ticketReference: string;
  carrier: string;
  comment: string | null;
  status: string;
  resolvedAt: string | null;
}

export interface HubCancellationRequest {
  id: string;
  reason: string;
  status: string;
  requestedAt: string;
}

export interface HubOrderPaymentInfo {
  payment: {
    label: string | null;
    provider: 'PAYPLUG' | 'PAYPAL' | null;
    cardBrand: string | null;
    cardLast4: string | null;
    wallet: string | null;
    paidAt: string | null;
  };
  promo?: {
    used: boolean;
    code: string | null;
    discountTTC: number | null;
    freeShipping: boolean;
  } | null;
}

export interface HubWarehouseInfo {
  code: string;
  label: string | null;
  distributorName: string | null;
}

export interface HubLogisticsDetail {
  success: boolean;
  message: string;
  data: {
    order: HubOrder;
    returnLabels: HubReturnLabel[];
    disputes: HubCarrierDispute[];
    latestCancellationRequest: HubCancellationRequest | null;
    relatedOrders?: HubRelatedOrder[];
    warehouseInfo?: HubWarehouseInfo | null;
    paymentInfo?: HubOrderPaymentInfo | null;
  } | null;
}

export type HubComparedCarrier = 'GLS' | 'DPD' | 'GLS_RELAIS';

export interface HubOrderTransportComparisonRow {
  carrier: HubComparedCarrier;
  label: string;
  /** Coût transport HT (grille x colis + malus) ; `null` sans grille pour ce transporteur. */
  costHT: number | null;
  deltaVsGlsHT: number | null;
  deltaVsRecordedHT: number | null;
}

/**
 * `GET hub-app/orders/:reference/transport-comparison` (SUPERADMIN) : coûts transport estimés de la
 * commande, colis par colis pour la grille utilisée dans la marge.
 */
export interface HubOrderTransportComparison {
  weightGrams: number;
  nbColis: number;
  malusTransportHT: number;
  /** Coût transport enregistré sur la commande, déduit de la marge. */
  recordedCarrierCostHT: number | null;
  /** Transporteur dont la grille alimente la marge (celui de la commande, repli GLS sans grille). */
  usedInMarginCarrier: HubComparedCarrier;
  /** Nom du transporteur de la commande quand la grille GLS a servi de repli. */
  marginFallbackFrom?: string | null;
  /** Tranche de la grille utilisée ; `null` sans tranche. */
  usedTier?: {
    perParcelWeightG: number;
    weightMinG: number;
    weightMaxG: number;
    perParcelCostHT: number;
  } | null;
  /** Colis estimés (poids en g et coût de grille). Absent d'une API plus ancienne. */
  parcels?: { weightG: number; costHT: number }[];
  chosenCarrier: HubComparedCarrier | null;
  chosenCarrierName: string | null;
  carriers: HubOrderTransportComparisonRow[];
}
