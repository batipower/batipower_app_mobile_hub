/**
 * Types de l'état de la flotte de scrapers et des serveurs d'impression, repris de
 * `front_externe_batipower` (`lib/api/hub-scraping.ts` et `lib/api/hub-print-servers.ts`),
 * limités aux champs affichés par les pastilles du cockpit.
 */

/** Registre WebSocket des agents de scraping (`hub-app/scraping/ws-agents`). */
export interface ScrapingAgentsSnapshot {
  totalConnected: number;
  idleAgents: number;
  busyAgents: number;
  pausedAgents: number;
  status: string;
  error?: string;
}

/** Bots en route (connectés hors pause) face au nombre de bots optimal, pour un pays. */
export interface ScrapingFleetPool {
  country: string;
  running: number;
  paused: number;
  optimal: number;
  demandPerDay: number;
}

/** Cible de la flotte de scrapers par pays (`hub-app/scraping/fleet-target`, optimal en cache 15 min côté back). */
export interface ScrapingFleetTarget {
  pools: ScrapingFleetPool[];
  totalRunning: number;
  totalOptimal: number;
  /** Bots connectés sans pays de pool : comptés dans FR côté back, signalés à part. */
  unspecializedAgents: number;
  perAgentDailyThroughput: number;
  targetUtilization: number;
  usedFallbackThroughput: boolean;
  windowDays: number;
  computedAt: string;
  status: string;
  error?: string;
}

export type PrintServerStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'DUPLICATE_INSTANCE'
  | 'STALLED'
  | 'PRINTER_UNREACHABLE'
  | 'BACKLOG'
  | 'DISABLED';

export interface PrintServerItem {
  serverId: string;
  warehouse: string;
  enabled: boolean;
  status: PrintServerStatus;
}

/** Serveurs d'impression des entrepôts (`hub-app/print-servers`), SUPERADMIN. */
export interface PrintServersOverview {
  summary: {
    total: number;
    online: number;
    problems: number;
    pendingLabels: number;
  };
  servers: PrintServerItem[];
  status: string;
}
