import type { HubProductOrder, HubSavOrder, OrderSearchHit } from '@/types/order';
import type { HubProductSearchHit } from '@/types/product';

/** Nombre minimal de caractères avant de lancer une recherche (comme le web). */
export const MIN_SEARCH_LENGTH = 2;

/** Nombre de résultats par voie dans l'aperçu de la saisie en direct (comme le web). */
export const PREVIEW_LIMIT = 6;

/** Taille de page de la liste complète des commandes. */
export const PAGE_SIZE = 20;

/**
 * Un code ou un EAN (8 caractères et plus, sans espace) est collé ou scanné : on lance
 * plus tôt. Une saisie libre (nom) attend un peu plus, pour ne pas multiplier les appels.
 */
export function searchDebounceMs(value: string): number {
  const term = value.trim();
  return term.length >= 8 && /^[A-Za-z0-9-]+$/.test(term) ? 120 : 250;
}

/** Référence commande Batipower (`BATPWR…`) : inutile de chercher aussi par produit. */
export function looksLikeOrderReference(term: string): boolean {
  return /^batpwr/i.test(term.replace(/\s+/g, ''));
}

/**
 * Fusionne les commandes trouvées par la recherche libre et celles qui contiennent la
 * référence produit, en une liste dédoublonnée par `uuid`. Port de `mergeOrderResults`
 * du web : une commande trouvée par les deux voies est marquée `containsProduct`.
 */
export function mergeOrderResults(
  sav: readonly HubSavOrder[],
  byProduct: readonly HubProductOrder[],
): OrderSearchHit[] {
  const merged = new Map<string, OrderSearchHit>();

  for (const order of sav) {
    merged.set(order.uuid, {
      uuid: order.uuid,
      reference: order.reference,
      status: order.status,
      origin: order.origin,
      totalPaid: order.totalPaid,
      createdAt: order.createdAt,
      customer: order.customer,
      shipping: order.shipping,
      matchedOn: order.matchedOn ?? [],
      containsProduct: false,
    });
  }

  for (const order of byProduct) {
    const existing = merged.get(order.uuid);
    if (existing) {
      existing.containsProduct = true;
      continue;
    }
    merged.set(order.uuid, {
      uuid: order.uuid,
      reference: order.reference,
      status: order.status,
      origin: order.origin,
      totalPaid: order.totalPaid,
      createdAt: order.createdAt,
      customer: order.customer,
      shipping: order.shipping,
      matchedOn: [],
      containsProduct: true,
    });
  }

  return [...merged.values()];
}

/** Adapte une commande des listes paginées (une seule voie de recherche) au format d'affichage. */
export function toOrderHit(
  order: HubSavOrder | HubProductOrder,
  containsProduct: boolean,
): OrderSearchHit {
  return {
    uuid: order.uuid,
    reference: order.reference,
    status: order.status,
    origin: order.origin,
    totalPaid: order.totalPaid,
    createdAt: order.createdAt,
    customer: order.customer,
    shipping: order.shipping,
    matchedOn: 'matchedOn' in order ? (order.matchedOn ?? []) : [],
    containsProduct,
  };
}

const PRODUCT_MATCHED_ON_LABELS: Record<string, string> = {
  reference: 'Référence',
  codeFlevy: 'Code Flevy',
  codeDombasle: 'Code Dombasle',
  ean: 'EAN',
  skuAmazon: 'SKU Amazon',
  skuAmazon2: 'SKU Amazon 2',
  skuAmazon3: 'SKU Amazon 3',
  skuManoMano: 'SKU ManoMano',
  skuLeroyMerlin: 'SKU Leroy Merlin',
  skuCdiscount: 'SKU Cdiscount',
  skuCastorama: 'SKU Castorama',
  skuBricoman: 'SKU Bricoman',
  skuInternalAmazon: 'SKU interne Amazon',
  skuInternalLeroyMerlin: 'SKU interne Leroy Merlin',
  skuInternalBricoman: 'SKU interne Bricoman',
  designation: 'Désignation',
};

/** Libellé du champ produit qui a correspondu à la saisie. */
export function productMatchedOnLabel(field: string): string {
  return PRODUCT_MATCHED_ON_LABELS[field] ?? field;
}

/**
 * Produit à ouvrir directement à la validation du clavier : l'unique suggestion, ou
 * l'unique correspondance exacte (référence, code entrepôt, EAN ou SKU).
 */
export function resolveProductTarget(
  results: readonly Pick<HubProductSearchHit, 'reference' | 'exact'>[],
): string | null {
  if (results.length === 1) return results[0]?.reference ?? null;
  const exact = results.filter((result) => result.exact);
  return exact.length === 1 ? (exact[0]?.reference ?? null) : null;
}
