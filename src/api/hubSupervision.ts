import { apiClient } from '@/api/client';
import type { PrintServersOverview, ScrapingAgentsSnapshot } from '@/types/hubSupervision';

type ReadOptions = { signal?: AbortSignal };

/**
 * État en lecture seule des scrapers connectés et des serveurs d'impression, pour les
 * pastilles du cockpit. Pendant mobile de `hub-scraping.ts` et `hub-print-servers.ts` du web.
 */
export const hubSupervisionApi = {
  scrapingAgents({ signal }: ReadOptions = {}) {
    return apiClient.get<ScrapingAgentsSnapshot>('hub-app/scraping/ws-agents', { signal });
  },

  printServers({ signal }: ReadOptions = {}) {
    return apiClient.get<PrintServersOverview>('hub-app/print-servers', { signal });
  },
};
