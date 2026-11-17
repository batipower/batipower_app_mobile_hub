import type { StudioFacets } from '@/types/hubStudioJobs';

/** Valeur spéciale du filtre affaire : fiches sans aucun rattachement à une affaire. */
export const NO_AFFAIRE = '__none__';

export type StockMode = 'all' | 'with' | 'without';
export type StockWarehouse = '' | 'flevy' | 'dombasle' | 'qg';

export interface FacetFilters {
  brands: string[];
  categoryTypes: string[];
  /** Identifiants d'affaire, ou {@link NO_AFFAIRE}. */
  affaires: string[];
  stock: StockMode;
  stockWarehouse: StockWarehouse;
}

export const EMPTY_FACET_FILTERS: FacetFilters = {
  brands: [],
  categoryTypes: [],
  affaires: [],
  stock: 'all',
  stockWarehouse: '',
};

export const STOCK_WAREHOUSE_OPTIONS: readonly { value: Exclude<StockWarehouse, ''>; label: string }[] = [
  { value: 'flevy', label: 'Flevy' },
  { value: 'dombasle', label: 'Dombasle' },
  { value: 'qg', label: 'QG Batipower' },
];

export function hasActiveFacetFilters(filters: FacetFilters): boolean {
  return (
    filters.brands.length > 0 ||
    filters.categoryTypes.length > 0 ||
    filters.affaires.length > 0 ||
    filters.stock !== 'all'
  );
}

/**
 * Une fiche (ou un job) passe-t-elle les filtres ? Valeurs cochées d'un même filtre : OU. Filtres entre eux : ET.
 * Un critère absent (back plus ancien) n'exclut jamais la fiche.
 */
export function matchesFacets(filters: FacetFilters, source: StudioFacets): boolean {
  if (filters.brands.length > 0 && source.brand !== undefined) {
    if (!source.brand || !filters.brands.includes(source.brand)) return false;
  }

  if (filters.categoryTypes.length > 0 && source.categoryType !== undefined) {
    if (!source.categoryType || !filters.categoryTypes.includes(source.categoryType)) return false;
  }

  if (filters.affaires.length > 0 && source.affaires !== undefined) {
    const ids = source.affaires.map((a) => a.id);
    const wantsNone = filters.affaires.includes(NO_AFFAIRE);
    const matchesAffaire = filters.affaires.some((id) => id !== NO_AFFAIRE && ids.includes(id));
    if (!(matchesAffaire || (wantsNone && ids.length === 0))) return false;
  }

  if (filters.stock !== 'all' && source.stock !== undefined) {
    const { flevy, dombasle, qg } = source.stock;
    const flags = filters.stockWarehouse ? [source.stock[filters.stockWarehouse]] : [flevy, dombasle, qg];
    const hasStock = flags.some(Boolean);
    if (filters.stock === 'with' ? !hasStock : hasStock) return false;
  }

  return true;
}

export interface FacetOptions {
  /** Marques présentes, avec le nombre de produits concernés. */
  brands: { value: string; count: number }[];
  /** Services présents (`CategoryType`), avec le nombre de produits. */
  categoryTypes: { value: string; count: number }[];
  affaires: { id: string; name: string; count: number }[];
  /** Nombre de produits sans aucune affaire : l'option « Sans affaire » n'a de sens que s'il est positif. */
  unassignedCount: number;
}

const byLabel = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

/**
 * Valeurs proposées par les sélecteurs, d'après les produits réellement affichés (avant filtres de facettes).
 * Chaque liste tient compte des autres filtres mais pas du sien : cocher une marque réduit les services et affaires
 * proposés, sans vider la liste des marques. Une valeur déjà cochée reste proposée (à 0) pour pouvoir la décocher.
 */
export function collectFacetOptions(sources: StudioFacets[], filters: FacetFilters = EMPTY_FACET_FILTERS): FacetOptions {
  const pool = (without: Partial<FacetFilters>) => sources.filter((source) => matchesFacets({ ...filters, ...without }, source));

  const brandCounts = new Map<string, number>();
  for (const source of pool({ brands: [] })) {
    if (source.brand) brandCounts.set(source.brand, (brandCounts.get(source.brand) ?? 0) + 1);
  }
  for (const brand of filters.brands) if (!brandCounts.has(brand)) brandCounts.set(brand, 0);

  const typeCounts = new Map<string, number>();
  for (const source of pool({ categoryTypes: [] })) {
    if (source.categoryType) typeCounts.set(source.categoryType, (typeCounts.get(source.categoryType) ?? 0) + 1);
  }
  for (const type of filters.categoryTypes) if (!typeCounts.has(type)) typeCounts.set(type, 0);

  // Les noms d'affaire viennent de toutes les sources : une affaire cochée garde son libellé même à 0.
  const affaireNames = new Map<string, string>();
  for (const source of sources) for (const affaire of source.affaires ?? []) affaireNames.set(affaire.id, affaire.name);
  const affaireCounts = new Map<string, number>();
  let unassignedCount = 0;
  for (const source of pool({ affaires: [] })) {
    if (!source.affaires) continue;
    if (source.affaires.length === 0) unassignedCount += 1;
    for (const affaire of source.affaires) affaireCounts.set(affaire.id, (affaireCounts.get(affaire.id) ?? 0) + 1);
  }
  for (const id of filters.affaires) if (id !== NO_AFFAIRE && !affaireCounts.has(id)) affaireCounts.set(id, 0);

  return {
    brands: [...brandCounts].map(([value, count]) => ({ value, count })).sort((a, b) => byLabel(a.value, b.value)),
    categoryTypes: [...typeCounts].map(([value, count]) => ({ value, count })),
    affaires: [...affaireCounts]
      .map(([id, count]) => ({ id, name: affaireNames.get(id) ?? id, count }))
      .sort((a, b) => byLabel(a.name, b.name)),
    unassignedCount,
  };
}
