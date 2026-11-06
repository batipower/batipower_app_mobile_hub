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
