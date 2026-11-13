/**
 * Prix du produit sur le site (PrestaShop) : `hub-app/products/:reference/website/pricing`.
 * Reprend les champs utiles de `HubWebsitePricing` du web (`front_externe_batipower`).
 */

/** Contexte de marge du prix site. Absent de la réponse pour le MANAGER (marge réservée au SUPERADMIN). */
export interface HubWebsiteMarginContext {
  /** Prix d'achat fixe HT (base de la marge) ; `null` s'il n'est pas renseigné. */
  fixPriceHT: number | null;
  costHT: number | null;
  /** Marge HT en euros : prix effectif HT moins le prix d'achat. */
  marginHT: number | null;
  /** Marge en % du prix de vente HT. */
  marginPct: number | null;
}

export interface HubWebsitePricing {
  productId: number;
  reference?: string;
  name?: string;
  /** Prix catalogue HT hors écotaxe (champ `price` de PrestaShop). */
  priceHT: number;
  ecotaxHT: number;
  taxRatePct: number;
  /** Prix catalogue avant remise, écotaxe incluse. */
  basePriceHT: number;
  basePriceTTC: number;
  /** Prix réellement payé par un client (promo publique active comprise). */
  effectiveHT: number;
  effectiveTTC: number;
  hasSpecificPrice: boolean;
  margin?: HubWebsiteMarginContext;
}

export interface UpdateHubWebsiteDisplayPricePayload {
  priceHT?: number;
  priceTTC?: number;
  note?: string;
}
