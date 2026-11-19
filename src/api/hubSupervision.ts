import { apiClient } from '@/api/client';
import type {
  CarrierTestMode,
  CarrierTestRunResult,
  PrintServerLocation,
  PrintServerLocationInput,
  PrintServersOverview,
  PrintStats,
  PrintTestLabelResult,
  ScrapingAgentsSnapshot,
  ScrapingFleetTarget,
  TestableCarrier,
} from '@/types/hubSupervision';

type ReadOptions = { signal?: AbortSignal };

/**
 * État des scrapers connectés et des serveurs d'impression (pastilles du cockpit, page
 * Supervision impression). Pendant mobile de `hub-scraping.ts` et `hub-print-servers.ts` du web.
 * Les routes `hub-app/print-servers` sont réservées au SUPERADMIN.
 */
export const hubSupervisionApi = {
  scrapingAgents({ signal }: ReadOptions = {}) {
    return apiClient.get<ScrapingAgentsSnapshot>('hub-app/scraping/ws-agents', { signal });
  },

  fleetTarget({ signal }: ReadOptions = {}) {
    return apiClient.get<ScrapingFleetTarget>('hub-app/scraping/fleet-target', { signal });
  },

  printServers({ signal }: ReadOptions = {}) {
    return apiClient.get<PrintServersOverview>('hub-app/print-servers', { signal });
  },

  printStats(days: number, warehouse?: string, { signal }: ReadOptions = {}) {
    return apiClient.get<PrintStats>('hub-app/print-servers/stats', {
      query: { days, warehouse: warehouse && warehouse !== 'ALL' ? warehouse : undefined },
      signal,
    });
  },

  setPrintServerEnabled(serverId: string, enabled: boolean) {
    return apiClient.patch<{ status: string; serverId: string; enabled: boolean }>(
      `hub-app/print-servers/${encodeURIComponent(serverId)}`,
      { enabled },
    );
  },

  /** Dépose une étiquette de test dans la file de l'entrepôt du poste (imprimée au prochain scan, ~5 s). */
  sendTestLabel(serverId: string) {
    return apiClient.post<PrintTestLabelResult>(
      `hub-app/print-servers/${encodeURIComponent(serverId)}/test-label`,
    );
  },

  /** Test d'étiquette transporteur : `API` (créée puis annulée) ou `PRINT` (aussi imprimée sur l'entrepôt). */
  testCarrier(warehouse: string, carrier: TestableCarrier, mode: CarrierTestMode) {
    return apiClient.post<CarrierTestRunResult>('hub-app/print-servers/carrier-test', {
      warehouse,
      carrier,
      mode,
    });
  },

  /** Renseigne l'adresse postale d'un poste (géocodée côté back) ; `clear` la retire. */
  setPrintServerLocation(serverId: string, input: PrintServerLocationInput | { clear: true }) {
    return apiClient.patch<{ status: string; serverId: string; location: PrintServerLocation | null }>(
      `hub-app/print-servers/${encodeURIComponent(serverId)}/location`,
      input,
    );
  },
};
