import type { CategoryTypeEnum } from '@/types/discussions';

/**
 * Règles « préfixe du code interne -> service ». Miroir du back (`category-prefix-rules.util.ts`) : le préfixe le
 * plus long l'emporte. Le jeu par défaut est celui de la référence Batipower (1re lettre) ; chaque filiale a ses
 * propres règles (réglées dans l'admin distributeurs) servies par `GET hub-app/product-analyzer/category-rules`.
 */
export type CategoryRule = { prefix: string; category: CategoryTypeEnum };

export const DEFAULT_CATEGORY_RULES: readonly CategoryRule[] = [
  { prefix: 'C', category: 'CHAUFFAGE' },
  { prefix: 'E', category: 'ELECTRICITE' },
  { prefix: 'I', category: 'OUTILLAGE' },
  { prefix: 'P', category: 'PLOMBERIE' },
  { prefix: 'S', category: 'SANITAIRE' },
  { prefix: 'V', category: 'VENTILATION' },
  { prefix: 'W', category: 'CARRELAGE' },
];

function normalizePrefix(raw: string | null | undefined): string {
  return (raw ?? '').trim().toUpperCase();
}

/** Service du code d'après les règles (préfixe le plus long), `null` si aucune ne correspond. */
export function matchCategoryByPrefix(
  code: string | null | undefined,
  rules: readonly CategoryRule[],
): { category: CategoryTypeEnum; prefix: string } | null {
  const upper = (code ?? '').trim().toUpperCase();
  if (!upper) return null;
  let best: CategoryRule | null = null;
  for (const rule of rules) {
    const prefix = normalizePrefix(rule.prefix);
    if (!prefix || !upper.startsWith(prefix)) continue;
    if (!best || prefix.length > normalizePrefix(best.prefix).length) best = rule;
  }
  return best ? { category: best.category, prefix: normalizePrefix(best.prefix) } : null;
}

/** Un code avec `_` porte un préfixe fournisseur (ex. `NI001_`) : sa 1re lettre n'est pas une famille. */
export function hasSupplierPrefix(code: string): boolean {
  return code.includes('_');
}

/** Suggestion : règles de la filiale du code, sinon jeu par défaut. */
export function suggestCategoryFromRules(
  code: string | null | undefined,
  rules: readonly CategoryRule[] | null | undefined,
  ignoreSupplierPrefix = true,
): { category: CategoryTypeEnum; prefix: string } | null {
  const trimmed = (code ?? '').trim();
  if (!trimmed) return null;
  if (rules && rules.length > 0 && !(ignoreSupplierPrefix && hasSupplierPrefix(trimmed))) {
    const own = matchCategoryByPrefix(trimmed, rules);
    if (own) return own;
  }
  return matchCategoryByPrefix(trimmed, DEFAULT_CATEGORY_RULES);
}
