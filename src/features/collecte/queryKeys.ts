/** Préfixe de clés de cache de la collecte entrepôt (invalidation groupée après une action). */
export const COLLECTE_KEY = ['hub-collecte'] as const;
export const collecteUncollectedKey = (warehouse: string, minHours: number) =>
  [...COLLECTE_KEY, 'uncollected', warehouse, minHours] as const;
export const collecteLabelsKey = (reference: string) =>
  [...COLLECTE_KEY, 'labels', reference] as const;
