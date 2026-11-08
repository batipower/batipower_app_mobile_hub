/**
 * Contrôle du périmètre transporteur GLS (devis à transporteur unique).
 * Porté verbatim depuis `front-printer/lib/gls-scope.ts` (fonction pure,
 * aucune dépendance front-printer).
 *
 * GLS refuse les colis au-delà de certaines limites de poids / dimensions.
 * Ces constantes servent à détecter, ligne par ligne, un produit « hors
 * périmètre GLS » afin d'afficher un indicateur rouge et de bloquer la
 * génération / l'envoi du devis.
 *
 * Limites (ajustables) :
 * - Poids max par colis : 30 kg.
 * - Plus grande dimension : 200 cm.
 * - Circonférence : longueur + 2 × (largeur + hauteur) ≤ 300 cm.
 *
 * Les dimensions inconnues (null) ne sont PAS considérées comme une violation :
 * seul un dépassement avéré met la ligne hors périmètre.
 */

export const GLS_MAX_WEIGHT_G = 30000;
export const GLS_MAX_LONGEST_CM = 200;
export const GLS_MAX_GIRTH_CM = 300;

export interface GlsScopeInput {
  weightInGrams?: number | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
}

export interface GlsScopeResult {
  outOfScope: boolean;
  reasons: string[];
}

const isPositive = (v: number | null | undefined): v is number => v != null && Number.isFinite(v) && v > 0;

const formatKg = (grams: number): string => {
  const kg = grams / 1000;
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
};

/**
 * Évalue si une ligne dépasse le périmètre GLS. Le contrôle poids porte sur
 * le poids UNITAIRE (un article seul ne peut jamais constituer un colis GLS
 * valide s'il dépasse 30 kg). Le contrôle dimensions porte sur les
 * dimensions colis du produit (cm) quand elles sont connues.
 */
export function getLineGlsScope(line: GlsScopeInput): GlsScopeResult {
  const reasons: string[] = [];

  const weight = line.weightInGrams;
  if (isPositive(weight) && weight > GLS_MAX_WEIGHT_G) {
    reasons.push(`Poids ${formatKg(weight)} > ${formatKg(GLS_MAX_WEIGHT_G)}`);
  }

  const l = line.packageLengthCm;
  const w = line.packageWidthCm;
  const h = line.packageHeightCm;

  const dims = [l, w, h].filter(isPositive) as number[];
  if (dims.length > 0) {
    const longest = Math.max(...dims);
    if (longest > GLS_MAX_LONGEST_CM) {
      reasons.push(`Longueur ${longest} cm > ${GLS_MAX_LONGEST_CM} cm`);
    }
  }

  if (isPositive(l) && isPositive(w) && isPositive(h)) {
    const sorted = [l, w, h].sort((a, b) => b - a);
    const [longest = 0, mid = 0, shortest = 0] = sorted;
    const girth = longest + 2 * (mid + shortest);
    if (girth > GLS_MAX_GIRTH_CM) {
      reasons.push(`Circonférence ${girth} cm > ${GLS_MAX_GIRTH_CM} cm`);
    }
  }

  return { outOfScope: reasons.length > 0, reasons };
}
