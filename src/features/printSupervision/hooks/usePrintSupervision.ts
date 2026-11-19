import { useIsFocused } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { hubSupervisionApi } from '@/api/hubSupervision';

import { PRINT_OVERVIEW_REFRESH_MS, PRINT_STATS_DAYS } from '../display';
import { printOverviewKey, printStatsKey } from '../queryKeys';

/**
 * État des serveurs d'impression des entrepôts, relu toutes les 15 s tant que l'écran est
 * affiché (SUPERADMIN, `enabled` à faux pour tout autre compte : aucun appel).
 */
export function usePrintOverview(enabled: boolean) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: printOverviewKey,
    queryFn: ({ signal }) => hubSupervisionApi.printServers({ signal }),
    enabled,
    refetchInterval: focused ? PRINT_OVERVIEW_REFRESH_MS : false,
    staleTime: 10_000,
  });
}

/**
 * Étiquettes sorties aujourd'hui par entrepôt (statistiques sur 14 jours, tous dépôts), pour le
 * compteur « auj. » de chaque poste. Renvoie `null` tant que les statistiques ne sont pas chargées.
 */
export function useTodayLabelsByWarehouse(enabled: boolean): Map<string, number> | null {
  const focused = useIsFocused();
  const query = useQuery({
    queryKey: printStatsKey(PRINT_STATS_DAYS, 'ALL'),
    queryFn: ({ signal }) => hubSupervisionApi.printStats(PRINT_STATS_DAYS, 'ALL', { signal }),
    enabled,
    refetchInterval: focused ? 60_000 : false,
    staleTime: 30_000,
  });
  const rows = query.data?.byWarehouse;
  if (!rows) return null;
  return new Map(rows.map((row) => [row.warehouse, row.today]));
}
