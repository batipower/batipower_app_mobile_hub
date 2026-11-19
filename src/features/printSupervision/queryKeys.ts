/** Préfixe de clés de cache de la page Supervision impression (invalidation groupée après une action). */
export const PRINT_SUPERVISION_KEY = ['hub-print-supervision'] as const;
export const printOverviewKey = [...PRINT_SUPERVISION_KEY, 'overview'] as const;
export const printStatsKey = (days: number, warehouse: string) =>
  [...PRINT_SUPERVISION_KEY, 'stats', days, warehouse] as const;
