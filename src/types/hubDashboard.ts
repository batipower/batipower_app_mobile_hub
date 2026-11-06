/**
 * Types du cockpit HUB (`GET hub-app/dashboard/*`), portés de
 * `front_externe_batipower/lib/types/hub-dashboard.ts`. Seuls les champs lus par l'app
 * mobile sont modélisés ; l'API peut en renvoyer d'autres. Les champs marqués optionnels
 * tolèrent un back pas encore à jour.
 */

export type HubDashboardCountMap = Record<string, number>;

// ─── Logistique ──────────────────────────────────────────────────────────────

/** Vue compacte d'un entrepôt (performance sur 30 jours glissants). */
export interface HubWarehouseCompact {
  warehouse: string;
  ordersCount: number;
  pendingCount: number;
  overdue24h: number;
  overdue48h: number;
  todoCount: number;
  avgShipHours: number | null;
  shippedUnder48hPct: number | null;
}

export interface HubDashboardLogistics {
  ordersToday: number;
  ordersTodayByOrigin: HubDashboardCountMap;
  warehouseTodo: HubDashboardCountMap;
  unshippedOver24h: number;
  unshippedOver24hByWarehouse: HubDashboardCountMap;
  unshippedOver48h: number;
  unshippedOver48hByWarehouse: HubDashboardCountMap;
  overdueBackorders: number;
  unnotifiedMarketplaceShipping: number;
  printerErrors: number;
  palletQuotesPending: number;
  palletQuotesAnswered: number;
  colisExpectedToday: number;
  colisCollectedToday: number;
  colisMonthly: number;
  colisMonthlyN1: number;
  byWarehouse?: HubWarehouseCompact[];
}

// ─── SAV ─────────────────────────────────────────────────────────────────────

export interface HubDashboardSav {
  returnRateMonthPct: number;
  returnRatePrevMonthPct: number;
  returnsThisMonth: number;
  ordersThisMonth: number;
  returnLabelPipeline: HubDashboardCountMap;
  marketplaceReturnPipeline: HubDashboardCountMap;
  topBrokenCauses: { cause: string; count: number }[];
  avgTreatmentHours: number | null;
  refundsThisMonth: number;
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface HubDashboardCaByOrigin {
  /** `Order.origin`, y compris `WEBSITE` (le site n'est pas une marketplace). */
  origin: string;
  turnoverHT: number;
  ordersCount: number;
}

/**
 * CA HT et marge brute HT d'un ensemble de commandes réalisées :
 * `marginHT = caHT - purchasesHT - transportHT - commissionsHT + quoteAdjustmentHT`.
 */
export interface HubMarginComponents {
  ordersCount: number;
  caHT: number;
  purchasesHT: number;
  transportHT: number;
  commissionsHT: number;
  quoteAdjustmentHT: number;
  marginHT: number;
  /** Nombre de colis expédiés. */
  parcels: number;
  units?: number;
  /** Commandes dont le prix d'achat, le poids ou la grille est manquant. */
  incompleteOrders: number;
  quoteOrders: number;
}

export interface HubDailyMarginOrigin extends HubMarginComponents {
  origin: string;
}

export interface HubDailyMargin extends HubMarginComponents {
  /** Jour Europe/Paris, `YYYY-MM-DD`. */
  date: string;
  byOrigin: HubDailyMarginOrigin[];
}

/** Moyenne par jour du mois calendaire (jusqu'à hier) : référence de l'histogramme du CA. */
export interface HubCaMonthAverage {
  from: string;
  to: string;
  days: number;
  /** `previous-month` : repli le 1er du mois, quand aucun jour du mois n'est écoulé. */
  scope: 'current-month' | 'previous-month';
  caHT: number;
  marginHT: number;
  ordersCount: number;
}

/** Factures / avoirs HT du mois. */
export interface HubMonthAccounting {
  invoicedHT: number;
  invoicesCount: number;
  creditSlipsHT: number;
  creditSlipsCount: number;
  /** CA comptable net : `invoicedHT - creditSlipsHT`. */
  netHT: number;
}

/** Cumul d'un mois civil. */
export interface HubMonthSummary {
  /** `YYYY-MM`. */
  month: string;
  caHT: number;
  marginHT: number;
  ordersCount: number;
  units?: number;
  parcels?: number;
  /** Avoirs du mois (produits + port HT) ; `null` si indisponible. */
  creditSlipsHT: number | null;
  creditSlipsCount: number | null;
  /** `null` si les tables comptables sont illisibles. */
  accounting?: HubMonthAccounting | null;
}

/** `hub-app/dashboard/ca-month` : CA HT et marge brute HT jour par jour d'un mois civil. */
export interface HubCaMonthView {
  /** `YYYY-MM`. */
  month: string;
  /** Mois en cours : le dernier jour est la journée en cours (partielle). */
  isCurrent: boolean;
  days: HubDailyMargin[];
  /** Moyenne par jour des jours complets du mois (hors aujourd'hui pour le mois en cours). */
  average: HubCaMonthAverage;
  summary: HubMonthSummary;
}

export interface HubDashboardFinance {
  /** CA HT du jour (Europe/Paris), toutes origines confondues. */
  caTodayHT: number;
  caTodayByOrigin: HubDashboardCaByOrigin[];
  /** CA HT et marge des 30 derniers jours, du plus ancien au jour courant inclus. */
  caHistory?: HubDailyMargin[];
  caMonthAverage?: HubCaMonthAverage;
  monthSummary?: HubMonthSummary;
}

// ─── Synchro marketplaces ────────────────────────────────────────────────────

/** Résumé exposé par le cockpit pour le bandeau « Synchro en pause ». */
export interface MarketplaceSyncSummary {
  pausedMarketplaces: string[];
  pendingCount: number;
}

// ─── Vue d'ensemble ──────────────────────────────────────────────────────────

/** `hub-app/dashboard/overview`. */
export interface HubDashboardOverview {
  generatedAt: string;
  logistics: HubDashboardLogistics;
  sav: HubDashboardSav;
  marketplaceSync?: MarketplaceSyncSummary;
  /** Absent pour un rôle sans accès à la finance. */
  finance?: HubDashboardFinance;
}

// ─── Commandes d'un jour ─────────────────────────────────────────────────────

/** Une commande réalisée du jour avec sa marge. */
export interface HubDayOrderRow {
  reference: string;
  /** ISO 8601. */
  createdAt: string;
  origin: string;
  caHT: number;
  purchasesHT: number;
  transportHT: number;
  commissionsHT: number;
  marginHT: number;
  units: number;
  /** Prix d'achat, poids ou grille manquant : marge à confirmer. */
  incomplete: boolean;
  fromQuote: boolean;
}

/** `hub-app/dashboard/orders` : commandes réalisées d'un jour Paris, filtrées par origine. */
export interface HubDayOrders {
  /** `YYYY-MM-DD`, Europe/Paris. */
  date: string;
  /** Origines demandées ; vide = toutes. */
  origins: string[];
  ordersCount: number;
  caHT: number;
  marginHT: number;
  units: number;
  orders: HubDayOrderRow[];
}

// ─── Support (site internet) ─────────────────────────────────────────────────

export interface SupportResponseTimeStats {
  responses: number;
  avgRawMs: number | null;
  avgWorkingMs: number | null;
  medianRawMs: number | null;
  medianWorkingMs: number | null;
}

export interface SupportOperatorResponseTime extends SupportResponseTimeStats {
  /** `null` pour les réponses envoyées avant le suivi des opérateurs. */
  operatorId: string | null;
  operatorName: string | null;
}

/** `support-chat/staff/stats/response-times` : délais de réponse du support (SUPERADMIN). */
export interface SupportResponseTimes {
  days: number;
  since: string;
  generatedAt: string;
  global: SupportResponseTimeStats & { pendingConversations: number };
  operators: SupportOperatorResponseTime[];
}
