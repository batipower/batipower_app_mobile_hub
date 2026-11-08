/** Aplatit les pages d'une liste infinie en retirant les doublons (une ligne peut glisser d'une page à l'autre). */
export function flattenPages<TItem, TPage>(
  pages: readonly TPage[] | undefined,
  itemsOf: (page: TPage) => readonly TItem[],
  keyOf: (item: TItem) => string,
): TItem[] {
  const seen = new Set<string>();
  const out: TItem[] = [];
  for (const page of pages ?? []) {
    for (const item of itemsOf(page)) {
      const key = keyOf(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** Nombre de lignes demandées par page des listes PARTNER. */
export const PARTNER_PAGE_SIZE = 25;

/** Pluriel français simple : « 1 produit », « 3 produits ». */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}
