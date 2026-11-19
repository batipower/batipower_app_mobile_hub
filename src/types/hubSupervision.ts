/**
 * Types de l'état de la flotte de scrapers et des serveurs d'impression, repris de
 * `front_externe_batipower` (`lib/api/hub-scraping.ts` et `lib/api/hub-print-servers.ts`),
 * limités aux champs affichés par les pastilles du cockpit et la page Supervision impression.
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

/** Adresse postale (géocodée) d'un poste d'impression : alimente la carte de la supervision. */
export interface PrintServerLocation {
  locationLabel: string | null;
  addressLine: string;
  postalCode: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  geocodedAt: string | null;
  geocodeSource: string | null;
}

export interface PrintServerItem {
  serverId: string;
  warehouse: string;
  name: string | null;
  hostname: string | null;
  version: string | null;
  printMode: string | null;
  printerTarget: string | null;
  enabled: boolean;
  connected: boolean;
  status: PrintServerStatus;
  problems: string[];
  lastSeenAt: string | null;
  lastDisconnectedAt: string | null;
  lastPollError: string | null;
  lastPrintAt: string | null;
  printerReachable: boolean | null;
  /** Erreurs d'envoi depuis minuit selon le poste ; null si non remonté aujourd'hui. */
  printErrorsToday: number | null;
  pendingCount: number;
  oldestPendingAgeSec: number | null;
  /** Adresse postale du poste ; null / absent tant qu'elle n'est pas renseignée. */
  location?: PrintServerLocation | null;
}

/** Entrepôt dont les étiquettes s'accumulent sans serveur d'impression actif. */
export interface UnmonitoredWarehouse {
  warehouse: string;
  pendingCount: number;
  oldestPendingAgeSec: number | null;
  problem: boolean;
}

export type TestableCarrier = 'GLS' | 'DPD';
export type CarrierTestMode = 'API' | 'PRINT';

/** Transporteur rattaché à un entrepôt, testable depuis la supervision. */
export interface CarrierTestOption {
  carrier: TestableCarrier;
  ready: boolean;
  reason?: string;
}

export interface CarrierTestResult {
  serviceKind: string;
  account?: string;
  trackingNumber: string | null;
  labelBytes: number;
  cancelled: boolean;
  cancelError?: string;
  printedFileId?: string;
  durationMs: number;
  error?: string;
}

export interface CarrierTestRunResult {
  status: string;
  carrier: TestableCarrier;
  warehouse: string;
  mode: CarrierTestMode;
  results: CarrierTestResult[];
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
  unmonitoredWarehouses: UnmonitoredWarehouse[];
  /** Transporteurs testables par entrepôt (absent sur un back plus ancien). */
  carrierTests?: Record<string, CarrierTestOption[]>;
  status: string;
}

/** Statistiques d'impression (`hub-app/print-servers/stats`), limitées au compteur « aujourd'hui » par entrepôt. */
export interface PrintStats {
  byWarehouse: { warehouse: string; today: number; period: number }[];
  status: string;
}

export interface PrintTestLabelResult {
  status: string;
  serverId: string;
  fileId: string;
  name: string;
  warehouse: string;
  requestedAt: string;
}

export interface PrintServerLocationInput {
  locationLabel?: string | null;
  addressLine: string;
  postalCode: string;
  city: string;
  country?: string;
}
