import { useIsFocused } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubDashboardApi } from '@/api/hubDashboard';
import { hubFinanceApi } from '@/api/hubFinance';
import { hubPartnerStatsApi } from '@/api/hubPartnerStats';
import type { TeogestEnvironment } from '@/types/hubFinance';
import type { PartnerStatsRange } from '@/types/hubPartnerStats';
import type { WebsiteDashboardPeriod } from '@/types/hubWebsiteDashboard';

import { HUB_VIEWS_KEY } from './HubDashboardScreen';

const WEBSITE_REFRESH_MS = 5 * 60_000;

/** Vue « Site » sur une période ; les chiffres précédents restent affichés pendant le changement. */
export function useWebsiteDashboard(period: WebsiteDashboardPeriod) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: [...HUB_VIEWS_KEY, 'website', period],
    queryFn: ({ signal }) => hubDashboardApi.website(period, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: focused ? WEBSITE_REFRESH_MS : false,
    staleTime: 60_000,
  });
}

/** Stats PARTNER : prix renseignés sur opportunités (synthèse), sur une période. */
export function usePartnerOpportunities(range: PartnerStatsRange) {
  return useQuery({
    queryKey: [...HUB_VIEWS_KEY, 'partner', 'opportunities', range.startDate, range.endDate],
    queryFn: ({ signal }) => hubPartnerStatsApi.opportunitiesOverview(range, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Derniers prix renseignés sur opportunités (page unique, `limit` lignes). */
export function usePartnerLatestPrices(range: PartnerStatsRange, limit: number) {
  return useQuery({
    queryKey: [...HUB_VIEWS_KEY, 'partner', 'latest-prices', range.startDate, range.endDate, limit],
    queryFn: ({ signal }) =>
      hubPartnerStatsApi.latestPrices({ ...range, page: 1, limit }, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Stats PARTNER : hausses et baisses de prix d'achat (synthèse). */
export function usePartnerPriceChanges(range: PartnerStatsRange) {
  return useQuery({
    queryKey: [...HUB_VIEWS_KEY, 'partner', 'changes-overview', range.startDate, range.endDate],
    queryFn: ({ signal }) => hubPartnerStatsApi.priceChangesOverview(range, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePartnerPriceChangesByBrand(range: PartnerStatsRange) {
  return useQuery({
    queryKey: [...HUB_VIEWS_KEY, 'partner', 'changes-brand', range.startDate, range.endDate],
    queryFn: ({ signal }) => hubPartnerStatsApi.priceChangesByBrand(range, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePartnerPriceChangesByUser(range: PartnerStatsRange) {
  return useQuery({
    queryKey: [...HUB_VIEWS_KEY, 'partner', 'changes-user', range.startDate, range.endDate],
    queryFn: ({ signal }) => hubPartnerStatsApi.priceChangesByUser(range, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePartnerLatestPriceChanges(range: PartnerStatsRange, limit: number) {
  return useQuery({
    queryKey: [
      ...HUB_VIEWS_KEY,
      'partner',
      'latest-changes',
      range.startDate,
      range.endDate,
      limit,
    ],
    queryFn: ({ signal }) =>
      hubPartnerStatsApi.latestPriceChanges({ ...range, page: 1, limit }, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Vue « Financier » : derniers calculs enregistrés de l'exercice (lecture en base). */
export function useFinanceSnapshots(year: number | undefined, environment: TeogestEnvironment) {
  return useQuery({
    queryKey: [...HUB_VIEWS_KEY, 'finance', 'snapshots', year ?? 'current', environment],
    queryFn: ({ signal }) => hubFinanceApi.snapshots({ year, environment }, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Anomalies de charges de l'exercice, calculées sur les calculs enregistrés. */
export function useFinanceAnomalies(
  year: number | undefined,
  environment: TeogestEnvironment,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...HUB_VIEWS_KEY, 'finance', 'anomalies', year ?? 'current', environment],
    queryFn: ({ signal }) => hubFinanceApi.anomalies({ year, environment }, { signal }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
