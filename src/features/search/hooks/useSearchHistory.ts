import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { searchHistoryApi } from '@/api/searchHistory';
import type { HubSearchHistoryEntry, RecordSearchHistoryPayload } from '@/types/searchHistory';

export const SEARCH_HISTORY_KEY = ['hub-search-history'] as const;

/** Recherches récentes de l'utilisateur, partagées avec le web (dix au plus, la plus récente en tête). */
export function useSearchHistory() {
  const query = useQuery({
    queryKey: SEARCH_HISTORY_KEY,
    queryFn: () => searchHistoryApi.list(),
    staleTime: 30_000,
  });

  return {
    entries: query.data ?? [],
    loading: query.isPending,
    refetch: query.refetch,
  };
}

/**
 * Enregistre et efface l'historique. L'enregistrement est « fire and forget » : il ne
 * doit jamais retarder ni bloquer la navigation, et son échec reste silencieux.
 */
export function useSearchHistoryActions() {
  const queryClient = useQueryClient();

  const setEntries = useCallback(
    (entries: HubSearchHistoryEntry[]) => queryClient.setQueryData(SEARCH_HISTORY_KEY, entries),
    [queryClient],
  );

  const record = useMutation({
    mutationFn: (entry: RecordSearchHistoryPayload) => searchHistoryApi.record(entry),
    onSuccess: setEntries,
  });
  const clear = useMutation({
    mutationFn: () => searchHistoryApi.clear(),
    onSuccess: setEntries,
  });

  const { mutate: mutateRecord } = record;
  const { mutate: mutateClear } = clear;

  return {
    recordSearch: useCallback(
      (entry: RecordSearchHistoryPayload) => mutateRecord(entry),
      [mutateRecord],
    ),
    clearHistory: useCallback(() => mutateClear(), [mutateClear]),
  };
}
