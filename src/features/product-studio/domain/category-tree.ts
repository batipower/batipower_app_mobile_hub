import type { StudioCategoryNode, StudioCategoryProposal } from '@/types/hubStudio';

/**
 * Arbre des catégories du Studio : fonctions pures (aucune dépendance React) pour construire
 * l'arbre, cocher avec les parents, chercher et calculer les ajouts / retraits.
 */

export interface CategoryTree {
  byId: Map<number, StudioCategoryNode>;
  /** Enfants directs triés par position puis nom. */
  childrenOf: Map<number, number[]>;
  /** Racines (sans parent, ou dont le parent est absent de l'arbre) triées. */
  roots: number[];
}

export function buildCategoryTree(nodes: StudioCategoryNode[]): CategoryTree {
  const byId = new Map<number, StudioCategoryNode>();
  for (const node of nodes) byId.set(node.id, node);

  const compare = (a: number, b: number) => {
    const na = byId.get(a)!;
    const nb = byId.get(b)!;
    return (na.position ?? 999) - (nb.position ?? 999) || na.name.localeCompare(nb.name, 'fr');
  };

  const childrenOf = new Map<number, number[]>();
  const roots: number[] = [];
  for (const node of byId.values()) {
    if (node.idParent && node.idParent !== node.id && byId.has(node.idParent)) {
      const siblings = childrenOf.get(node.idParent) ?? [];
      siblings.push(node.id);
      childrenOf.set(node.idParent, siblings);
    } else {
      roots.push(node.id);
    }
  }
  roots.sort(compare);
  for (const siblings of childrenOf.values()) siblings.sort(compare);
  return { byId, childrenOf, roots };
}

/** Ancêtres d'une catégorie, du parent direct jusqu'à la racine. */
export function ancestorsOf(id: number, tree: CategoryTree): number[] {
  const out: number[] = [];
  const seen = new Set<number>([id]);
  let parent = tree.byId.get(id)?.idParent;
  while (parent && tree.byId.has(parent) && !seen.has(parent)) {
    seen.add(parent);
    out.push(parent);
    parent = tree.byId.get(parent)?.idParent;
  }
  return out;
}

/** Tous les descendants d'une catégorie. */
export function descendantsOf(id: number, tree: CategoryTree): number[] {
  const out: number[] = [];
  const seen = new Set<number>([id]);
  const stack = [...(tree.childrenOf.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    stack.push(...(tree.childrenOf.get(next) ?? []));
  }
  return out;
}

/** Chemin lisible « Racine > Parent > Catégorie » (repli sur #id pour une catégorie hors arbre). */
export function pathOf(id: number, tree: CategoryTree): string {
  if (!tree.byId.has(id)) return `#${id}`;
  return [...ancestorsOf(id, tree).reverse(), id].map((part) => tree.byId.get(part)?.name ?? `#${part}`).join(' > ');
}

/**
 * Coche ou décoche une catégorie. Cocher ajoute aussi toute la chaîne de ses parents ;
 * décocher retire aussi ses descendants (une sous-catégorie ne reste pas sans son parent).
 */
export function toggleCategory(selected: ReadonlySet<number>, id: number, tree: CategoryTree): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
    for (const child of descendantsOf(id, tree)) next.delete(child);
  } else {
    next.add(id);
    for (const parent of ancestorsOf(id, tree)) next.add(parent);
  }
  return next;
}

/** Ajoute des catégories (propositions IA) avec leurs parents. */
export function addCategories(selected: ReadonlySet<number>, ids: number[], tree: CategoryTree): Set<number> {
  const next = new Set(selected);
  for (const id of ids) {
    next.add(id);
    for (const parent of ancestorsOf(id, tree)) next.add(parent);
  }
  return next;
}

/** Sélection de départ : état final déjà relu, sinon catégories actuelles + propositions IA cochées. */
export function initialSelection(proposal: StudioCategoryProposal | null | undefined, tree: CategoryTree): Set<number> {
  if (!proposal) return new Set();
  if (proposal.finalIds?.length) return new Set(proposal.finalIds);
  const selectedItems = (proposal.items ?? []).filter((item) => item.selected).map((item) => item.categoryId);
  return addCategories(new Set(proposal.currentIds ?? []), selectedItems, tree);
}

/** Catégorie principale de départ. */
export function initialDefault(proposal: StudioCategoryProposal | null | undefined): number | undefined {
  if (!proposal) return undefined;
  if (proposal.finalIds?.length && proposal.defaultId) return proposal.defaultId;
  if (proposal.applyDefault && proposal.suggestedDefaultId) return proposal.suggestedDefaultId;
  return proposal.currentDefaultId;
}

/**
 * Catégorie principale valide pour une sélection : la souhaitée si elle est cochée, sinon l'actuelle,
 * sinon la sélection la plus profonde (la plus précise) ; `undefined` si la sélection est vide.
 */
export function resolveDefault(
  selected: ReadonlySet<number>,
  wanted: number | undefined,
  currentDefaultId: number | undefined,
  tree: CategoryTree,
): number | undefined {
  if (wanted && selected.has(wanted)) return wanted;
  if (currentDefaultId && selected.has(currentDefaultId)) return currentDefaultId;
  let best: number | undefined;
  let bestDepth = -1;
  for (const id of selected) {
    const depth = ancestorsOf(id, tree).length;
    if (depth > bestDepth) {
      best = id;
      bestDepth = depth;
    }
  }
  return best;
}

export interface CategoryDiff {
  added: number[];
  removed: number[];
  defaultChanged: boolean;
}

export function diffCategories(
  currentIds: number[],
  selected: ReadonlySet<number>,
  currentDefaultId: number | undefined,
  defaultId: number | undefined,
): CategoryDiff {
  const current = new Set(currentIds);
  return {
    added: [...selected].filter((id) => !current.has(id)),
    removed: currentIds.filter((id) => !selected.has(id)),
    defaultChanged: Boolean(defaultId) && defaultId !== currentDefaultId,
  };
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface CategoryFilter {
  /** Catégories à afficher : correspondances et leurs ancêtres. */
  visible: Set<number>;
  matches: Set<number>;
}

/** Filtre l'arbre sur le nom (sans accents ni casse) en gardant les ancêtres des résultats. `null` si pas de recherche. */
export function filterCategories(query: string, tree: CategoryTree): CategoryFilter | null {
  const needle = normalize(query);
  if (!needle) return null;
  const matches = new Set<number>();
  const visible = new Set<number>();
  for (const node of tree.byId.values()) {
    if (!normalize(node.name).includes(needle)) continue;
    matches.add(node.id);
    visible.add(node.id);
    for (const parent of ancestorsOf(node.id, tree)) visible.add(parent);
  }
  return { visible, matches };
}

/** Nombre de catégories cochées sous chaque nœud (descendants uniquement). */
export function selectedDescendantCounts(selected: ReadonlySet<number>, tree: CategoryTree): Map<number, number> {
  const counts = new Map<number, number>();
  for (const id of selected) {
    for (const parent of ancestorsOf(id, tree)) counts.set(parent, (counts.get(parent) ?? 0) + 1);
  }
  return counts;
}

/** Branches à déplier d'office : celles qui contiennent une catégorie cochée. */
export function expandedForSelection(selected: ReadonlySet<number>, tree: CategoryTree): Set<number> {
  const expanded = new Set<number>();
  for (const id of selected) for (const parent of ancestorsOf(id, tree)) expanded.add(parent);
  return expanded;
}
