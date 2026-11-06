import { apiClient } from '@/api/client';
import type { HubSearchHistoryEntry, RecordSearchHistoryPayload } from '@/types/searchHistory';

const BASE = 'hub-app/search-history';

/**
 * Dix dernières recherches de l'utilisateur, partagées avec le web. Chaque appel renvoie
 * la liste à jour. Le back ne manipule que l'historique de l'utilisateur connecté.
 */
export const searchHistoryApi = {
  list() {
    return apiClient.get<HubSearchHistoryEntry[]>(BASE);
  },
  record(entry: RecordSearchHistoryPayload) {
    return apiClient.post<HubSearchHistoryEntry[]>(BASE, entry);
  },
  clear() {
    return apiClient.delete<HubSearchHistoryEntry[]>(BASE);
  },
};
