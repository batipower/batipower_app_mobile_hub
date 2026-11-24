import { useIsFocused } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubQuotasApi } from '@/api/hubQuotas';

export const QUOTAS_KEY = ['hub-quotas'] as const;

const QUOTAS_REFRESH_MS = 5 * 60_000;

/** Quotas surveillés : valeurs lentes à bouger, relues toutes les 5 minutes (écran au premier plan). */
export function useQuotasSummary({ enabled = true }: { enabled?: boolean } = {}) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: QUOTAS_KEY,
    queryFn: ({ signal }) => hubQuotasApi.summary({ signal }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: focused ? QUOTAS_REFRESH_MS : false,
    staleTime: 60_000,
  });
}
