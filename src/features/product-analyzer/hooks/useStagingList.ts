import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import { STAGING_PAGE_SIZE } from '@/features/product-analyzer/lib/constants';
import type { StagingFilters, StagingItem, ViabilityTab } from '@/types/hubProductAnalyzer';

import {
  PA_AFFAIRES_KEY,
  PA_BRANDS_KEY,
  PA_COUNTS_KEY,
  PA_LIST_KEY,
  PA_TAGS_KEY,
  paAffaireStatsKey,
} from '../queryKeys';

/** Les champs sans effet sur la requête (page, `detail`) sont écartés des clés de cache. */
function normalize(filters: StagingFilters): StagingFilters {
  return { ...filters, detail: '', page: 1, limit: STAGING_PAGE_SIZE };
}

/**
 * Historique paginé (défilement infini, 15 par page). Le total vient de la première page ;
 * les doublons (une analyse remontée en tête entre deux pages) sont écartés.
 */
export function useStagingList(filters: StagingFilters) {
  const base = useMemo(() => normalize(filters), [filters]);

  const query = useInfiniteQuery<{ items: StagingItem[]; total: number }>({
    queryKey: [...PA_LIST_KEY, base],
    queryFn: async ({ pageParam, signal }) => {
      const page = await hubProductAnalyzerApi.listStaging(base, {
        signal,
        page: pageParam as number,
        limit: STAGING_PAGE_SIZE,
      });
      return { items: page.items, total: page.total ?? page.items.length };
    },
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return last.items.length > 0 && loaded < last.total ? all.length + 1 : undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const items = useMemo<StagingItem[]>(() => {
    const seen = new Set<string>();
    const out: StagingItem[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.uuid)) continue;
        seen.add(item.uuid);
        out.push(item);
      }
    }
    return out;
  }, [query.data]);

  return {
    items,
    total: query.data?.pages[0]?.total ?? null,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    /** Rechargement d'une liste déjà affichée (changement de filtre) : pour un voile discret. */
    isRefetching: query.isFetching && !query.isFetchingNextPage && !query.isPending,
    /** Anciennes données conservées pendant le chargement des nouvelles. */
    isPlaceholder: query.isPlaceholderData,
  };
}

export type ViabilityCounts = { total: number; viable: number; negotiable: number; not_viable: number };

/** Compteurs des onglets de viabilité, calculés sur les autres filtres (le filtre de viabilité exclu). */
export function useViabilityCounts(filters: StagingFilters) {
  const base = useMemo(() => ({ ...normalize(filters), viability: 'all' as ViabilityTab }), [filters]);
  return useQuery<ViabilityCounts>({
    queryKey: [...PA_COUNTS_KEY, base],
    queryFn: async ({ signal }) => {
      const [total, viable, negotiable, notViable] = await Promise.all([
        hubProductAnalyzerApi.countStaging(base, undefined, signal),
        hubProductAnalyzerApi.countStaging({ ...base, viability: 'viable' }, undefined, signal),
        hubProductAnalyzerApi.countStaging({ ...base, viability: 'negotiable' }, undefined, signal),
        hubProductAnalyzerApi.countStaging({ ...base, viability: 'not_viable' }, undefined, signal),
      ]);
      return { total, viable, negotiable, not_viable: notViable };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** Marques présentes dans l'historique (selon les autres filtres), pour le sélecteur de marques. */
export function useBrands(filters: StagingFilters, enabled = true) {
  const base = useMemo(() => normalize(filters), [filters]);
  return useQuery({
    queryKey: [...PA_BRANDS_KEY, base],
    queryFn: ({ signal }) => hubProductAnalyzerApi.listBrands(base, signal),
    select: (data) => data.brands ?? [],
    staleTime: 60_000,
    enabled,
  });
}

export function useTags(enabled = true) {
  return useQuery({
    queryKey: PA_TAGS_KEY,
    queryFn: ({ signal }) => hubProductAnalyzerApi.listTags(signal),
    select: (data) => data.tags ?? [],
    staleTime: 60_000,
    enabled,
  });
}

export function useAffaires(enabled = true) {
  return useQuery({
    queryKey: PA_AFFAIRES_KEY,
    queryFn: ({ signal }) => hubProductAnalyzerApi.listAffaires(signal),
    select: (data) => data.items ?? [],
    staleTime: 60_000,
    enabled,
  });
}

export function useAffaireStats(affaireId: string | null | undefined) {
  return useQuery({
    queryKey: paAffaireStatsKey(affaireId ?? ''),
    queryFn: ({ signal }) => hubProductAnalyzerApi.getAffaireStats(affaireId as string, signal),
    enabled: !!affaireId,
    staleTime: 30_000,
  });
}
