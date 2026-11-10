import { useIsFocused } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { flowDashboardApi } from '@/api/hubFlowDashboard';
import type { FlowDashboardCountryCode } from '@/types/flowDashboard';

/** Préfixe commun des requêtes du dashboard flux. */
export const FLOW_DASHBOARD_KEY = ['partner-flow-dashboard'] as const;

const REFRESH_MS = 60_000;

/**
 * Dashboard flux simplifié sur les mois (`YYYY-MM`) et le pays choisis. Les chiffres précédents
 * restent affichés pendant un changement de filtre ; l'actualisation automatique ne tourne
 * que sur l'écran visible.
 */
export function useFlowDashboard(months: readonly string[], country: FlowDashboardCountryCode | null) {
  const focused = useIsFocused();
  const monthsParam = [...months].sort().join(',');
  return useQuery({
    queryKey: [...FLOW_DASHBOARD_KEY, monthsParam, country],
    queryFn: ({ signal }) =>
      flowDashboardApi.simple({ months: monthsParam, country: country ?? undefined }, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: focused ? REFRESH_MS : false,
    staleTime: 30_000,
  });
}
