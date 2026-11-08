/** Préfixe de clés de cache du contrôle des annulations (invalidation groupée après une action). */
export const CANCELLATION_CONTROL_KEY = ['hub-cancellation-control'] as const;
export const cancellationControlListKey = (status: string) =>
  [...CANCELLATION_CONTROL_KEY, 'list', status] as const;
