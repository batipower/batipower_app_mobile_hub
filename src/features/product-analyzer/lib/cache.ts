import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { StagingItem } from '@/types/hubProductAnalyzer';

import { PA_LIST_KEY, paStagingKey } from '../queryKeys';

type ListPage = { items: StagingItem[]; total: number };

/**
 * Mise à jour optimiste d'un produit dans le cache : les pages de l'historique déjà chargées
 * et sa fiche. Retourne une fonction qui rétablit l'état précédent (en cas d'échec de l'API).
 */
export function patchStagingInCache(
  queryClient: QueryClient,
  uuid: string,
  patch: Partial<StagingItem>,
): () => void {
  const lists = queryClient.getQueriesData<InfiniteData<ListPage>>({ queryKey: PA_LIST_KEY });
  const detail = queryClient.getQueryData<StagingItem>(paStagingKey(uuid));

  queryClient.setQueriesData<InfiniteData<ListPage>>({ queryKey: PA_LIST_KEY }, (prev) =>
    prev
      ? {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            items: page.items.map((it) => (it.uuid === uuid ? { ...it, ...patch } : it)),
          })),
        }
      : prev,
  );
  queryClient.setQueryData<StagingItem>(paStagingKey(uuid), (prev) => (prev ? { ...prev, ...patch } : prev));

  return () => {
    for (const [key, data] of lists) queryClient.setQueryData(key, data);
    if (detail) queryClient.setQueryData(paStagingKey(uuid), detail);
  };
}

/** Retire un produit supprimé des pages de l'historique déjà chargées. */
export function removeStagingFromCache(queryClient: QueryClient, uuid: string) {
  queryClient.setQueriesData<InfiniteData<ListPage>>({ queryKey: PA_LIST_KEY }, (prev) =>
    prev
      ? {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            items: page.items.filter((it) => it.uuid !== uuid),
            total: Math.max(0, page.total - 1),
          })),
        }
      : prev,
  );
}
