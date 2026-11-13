/**
 * Calculs du prix site, alignés sur le back (`website-price.service.ts`, `website-margin.util.ts`) :
 * le prix catalogue HT (`basePriceHT`) inclut l'écotaxe, la marge se calcule en HT sur le prix
 * de vente HT et se rapporte au chiffre d'affaires HT (pas à un coefficient sur l'achat).
 */

/** TVA appliquée par le back quand PrestaShop n'en renvoie pas. */
const DEFAULT_TAX_RATE_PCT = 20;

const round2 = (value: number) => Math.round(value * 100) / 100;

function taxMultiplier(taxRatePct: number | null | undefined): number {
  return 1 + (taxRatePct || DEFAULT_TAX_RATE_PCT) / 100;
}

/** Prix HT (écotaxe comprise) correspondant à un prix TTC. */
export function ttcToHT(ttc: number, taxRatePct: number | null | undefined): number {
  return ttc / taxMultiplier(taxRatePct);
}

/** Marge HT (€) et en % du prix de vente HT, arrondies comme `marginFromCost` du back. */
export function marginFromCost(
  sellHT: number,
  costHT: number | null,
): { marginHT: number | null; marginPct: number | null } {
  if (costHT == null) return { marginHT: null, marginPct: null };
  const marginHT = round2(sellHT - costHT);
  const marginPct = sellHT > 0 ? Math.round((marginHT / sellHT) * 1000) / 10 : null;
  return { marginHT, marginPct };
}

/**
 * Prix TTC à afficher pour obtenir une marge cible (en % du prix de vente HT), arrondi au
 * centime. `null` si la marge est hors plage (100 % et plus) ou si le prix d'achat manque.
 */
export function ttcForMarginPct(
  marginPct: number,
  costHT: number | null,
  taxRatePct: number | null | undefined,
): number | null {
  if (costHT == null || !Number.isFinite(marginPct) || marginPct >= 100) return null;
  const sellHT = costHT / (1 - marginPct / 100);
  const ttc = round2(sellHT * taxMultiplier(taxRatePct));
  return Number.isFinite(ttc) && ttc > 0 ? ttc : null;
}

/** Analyse une saisie « 12,5 » ; `null` si vide ou invalide. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** Une promo publique est en cours : le prix payé diffère du prix catalogue. */
export function hasActivePromo(pricing: {
  hasSpecificPrice: boolean;
  effectiveTTC: number;
  basePriceTTC: number;
}): boolean {
  return pricing.hasSpecificPrice && Math.abs(pricing.effectiveTTC - pricing.basePriceTTC) > 0.005;
}

/** Valeur numérique prête à être affichée dans un champ de saisie (« 12,50 »). */
export function toInput(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '' : value.toFixed(2).replace('.', ',');
}
