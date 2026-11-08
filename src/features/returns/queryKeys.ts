/** Préfixes de clés de cache des retours (invalidation groupée après une action). */
export const RETURNS_KEY = ['hub-returns'] as const;
export const RETURNS_HISTORY_KEY = ['hub-returns', 'history'] as const;
export const returnDetailKey = (reference: string) => ['hub-returns', 'detail', reference] as const;
