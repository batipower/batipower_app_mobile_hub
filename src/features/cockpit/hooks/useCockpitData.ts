import { useMemo } from 'react';
import { useIsFocused } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubDashboardApi } from '@/api/hubDashboard';
import { hubSupervisionApi } from '@/api/hubSupervision';
import { percentDelta } from '@/lib/format';

import { dayOfMonth, daysInMonth, parisDateKey, parisMonthKey, shiftMonth } from '../dates';

/** Préfixe commun des requêtes du cockpit (invalidation / remise à zéro groupée). */
export const HUB_DASHBOARD_KEY = ['hub-dashboard'] as const;

const OVERVIEW_REFRESH_MS = 60_000;
const SUPPORT_REFRESH_MS = 5 * 60_000;
const STATUS_REFRESH_MS = 30_000;

/**
 * Vue d'ensemble du cockpit (`overview`), actualisée chaque minute tant que l'écran est
 * affiché. Les chiffres précédents restent affichés pendant un rechargement.
 */
export function useCockpitOverview() {
  const focused = useIsFocused();
  const query = useQuery({
    queryKey: [...HUB_DASHBOARD_KEY, 'overview'],
    queryFn: ({ signal }) => hubDashboardApi.overview({ signal }),
    placeholderData: keepPreviousData,
    refetchInterval: focused ? OVERVIEW_REFRESH_MS : false,
    staleTime: 30_000,
  });

  return {
    overview: query.data ?? null,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt || null,
  };
}

/** CA et marge jour par jour d'un mois civil (`YYYY-MM`) : histogramme du cockpit. */
export function useCaMonth(month: string) {
  const focused = useIsFocused();
  const isCurrent = month === parisMonthKey();
  const query = useQuery({
    queryKey: [...HUB_DASHBOARD_KEY, 'ca-month', month],
    queryFn: ({ signal }) => hubDashboardApi.caMonth(month, { signal }),
    // Pendant un changement de mois, l'ancien histogramme reste visible (estompé).
    placeholderData: keepPreviousData,
    // Un mois écoulé ne bouge plus ; le mois en cours suit le rythme du cockpit.
    refetchInterval: isCurrent && focused ? OVERVIEW_REFRESH_MS : false,
    staleTime: isCurrent ? 30_000 : 10 * 60_000,
  });

  return {
    view: query.data ?? null,
    /** Aucune donnée à afficher (premier chargement). */
    loading: query.isPending,
    /** Les données affichées sont celles d'un autre mois, en attendant celles du mois demandé. */
    switching: query.isPlaceholderData,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Commandes du mois en cours (journée en cours comprise) comparées à la même période du mois
 * précédent (jours 1 à N, N = jour courant, borné à la longueur de ce mois).
 *
 * S'appuie sur `useCaMonth` : la requête du mois courant est partagée avec l'histogramme du
 * cockpit (même clé React Query), seule celle du mois précédent s'ajoute.
 * - `current` : `null` si la requête du mois courant a échoué (pastille « — »).
 * - `previous` / `delta` : `null` si le mois précédent est indisponible (échec) ou sans commande
 *   (le nombre s'affiche alors seul).
 * - `loading` : tant qu'une des deux réponses n'est pas arrivée (succès ou échec).
 */
export function useOrdersMonthTrend() {
  const today = parisDateKey();
  const currentMonth = today.slice(0, 7);
  const previousMonth = shiftMonth(currentMonth, -1);
  const day = dayOfMonth(today);
  /** Dernier jour comparé : le 31 mars, tout février (28 ou 29 jours). */
  const lastDay = Math.min(day, daysInMonth(previousMonth));

  const currentQuery = useCaMonth(currentMonth);
  const previousQuery = useCaMonth(previousMonth);

  const currentView = currentQuery.view;
  const previousDays = previousQuery.view?.days;

  const previousToDate = useMemo(() => {
    if (!previousDays) return null;
    return previousDays.reduce(
      (sum, item) => (dayOfMonth(item.date) <= lastDay ? sum + item.ordersCount : sum),
      0,
    );
  }, [previousDays, lastDay]);

  const current = currentView ? currentView.summary.ordersCount : null;
  const delta =
    current !== null && previousToDate !== null ? percentDelta(current, previousToDate) : null;

  return {
    current,
    previous: previousToDate,
    delta,
    /** Mois précédent (`YYYY-MM`) et dernier jour comparé, pour le libellé d'accessibilité. */
    comparison: { month: previousMonth, lastDay },
    loading: currentQuery.loading || previousQuery.loading,
  };
}

/** Commandes réalisées d'un jour (`YYYY-MM-DD`), toutes origines : le filtre se fait à l'écran. */
export function useDayOrders(date: string | undefined) {
  const query = useQuery({
    queryKey: [...HUB_DASHBOARD_KEY, 'day-orders', date],
    queryFn: ({ signal }) => hubDashboardApi.dayOrders(date ?? '', [], { signal }),
    enabled: !!date,
    staleTime: 30_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.error,
    refetch: query.refetch,
  };
}

/** Scrapers connectés (registre WebSocket), actualisés toutes les 30 s. */
export function useScrapingAgents() {
  const focused = useIsFocused();
  return useQuery({
    queryKey: [...HUB_DASHBOARD_KEY, 'scraping-agents'],
    queryFn: ({ signal }) => hubSupervisionApi.scrapingAgents({ signal }),
    refetchInterval: focused ? STATUS_REFRESH_MS : false,
    staleTime: 10_000,
  });
}

/** Serveurs d'impression des entrepôts, actualisés toutes les 30 s. */
export function usePrintServers() {
  const focused = useIsFocused();
  return useQuery({
    queryKey: [...HUB_DASHBOARD_KEY, 'print-servers'],
    queryFn: ({ signal }) => hubSupervisionApi.printServers({ signal }),
    refetchInterval: focused ? STATUS_REFRESH_MS : false,
    staleTime: 10_000,
  });
}

/** Délais de réponse du support du site internet sur `days` jours (SUPERADMIN). */
export function useSupportResponseTimes(days: number) {
  const focused = useIsFocused();
  const query = useQuery({
    queryKey: [...HUB_DASHBOARD_KEY, 'support-response-times', days],
    queryFn: ({ signal }) => hubDashboardApi.supportResponseTimes(days, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: focused ? SUPPORT_REFRESH_MS : false,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}
