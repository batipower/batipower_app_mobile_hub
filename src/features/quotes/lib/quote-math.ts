/**
 * Fonctions mathématiques pures de l'éditeur de devis — portées depuis
 * `front-printer/app/responsable-achat/devis-client/page.tsx`.
 */

export function normalizeTaxRate(rate: number): number {
  if (rate > 1) return rate / 100;
  return rate;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Total TTC d'une ligne = « multiplier PUIS arrondir » (règle de facturation).
 * On calcule `quantité × prix unitaire HT × (1 + TVA)` en pleine précision et on
 * n'arrondit qu'à la fin. Ne JAMAIS faire `quantité × round2(prix unitaire TTC)`
 * (« arrondir puis multiplier ») : l'erreur d'arrondi unitaire est multipliée par
 * la quantité et fait diverger la somme des lignes du Total TTC du devis
 * (celui facturé via PayPlug et envoyé à PrestaShop).
 */
export function lineTotalTTC(quantity: number, unitPriceHT: number, taxRate: number): number {
  return round2(quantity * unitPriceHT * (1 + taxRate));
}

/**
 * Retourne l'écotaxe HT correspondant à l'entrepôt retenu (celui au plus bas
 * `(prix + écotaxe) × multiple` parmi Flevy / Dombasle). Aligné sur la logique
 * de `QuotePricingService` côté back. Retourne `null` si aucun entrepôt
 * pertinent n'est disponible.
 */
export function bestWarehouseEcotaxHT(
  row:
    | {
        purchasePriceFlevyHT?: number | null;
        purchasePriceDombasleHT?: number | null;
        ecotaxFlevyHT?: number | null;
        ecotaxDombasleHT?: number | null;
        supplierQuantityMultiplierFlevy?: number | null;
        supplierQuantityMultiplier?: number | null;
      }
    | null
    | undefined,
): number | null {
  if (!row) return null;
  const priceFlevy = Number(row.purchasePriceFlevyHT) || 0;
  const priceDombasle = Number(row.purchasePriceDombasleHT) || 0;
  const ecoFlevy = Number(row.ecotaxFlevyHT) || 0;
  const ecoDombasle = Number(row.ecotaxDombasleHT) || 0;
  const multFlevy = Number(row.supplierQuantityMultiplierFlevy) || 1;
  const multDombasle = Number(row.supplierQuantityMultiplier) || 1;
  const candidates: { unit: number; mult: number; eco: number }[] = [];
  if (priceFlevy > 0) candidates.push({ unit: priceFlevy + ecoFlevy, mult: multFlevy, eco: ecoFlevy });
  if (priceDombasle > 0) candidates.push({ unit: priceDombasle + ecoDombasle, mult: multDombasle, eco: ecoDombasle });
  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => (b.unit * b.mult < a.unit * a.mult ? b : a));
  return best.eco > 0 ? Number(best.eco.toFixed(4)) : 0;
}

/** Affiche un poids en kg avec 0 à 2 décimales selon l'amplitude. */
export function formatWeight(grams: number | null | undefined): string {
  if (grams == null || !Number.isFinite(grams) || grams <= 0) return '—';
  const kg = grams / 1000;
  if (kg >= 100) return `${kg.toFixed(0)} kg`;
  if (kg >= 10) return `${kg.toFixed(1)} kg`;
  return `${kg.toFixed(2)} kg`;
}
