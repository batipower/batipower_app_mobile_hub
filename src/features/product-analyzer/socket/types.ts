import type {
  AlreadyAnalyzedData,
  AnalysisReusedData,
  BlockedData,
  FullResult,
  StepData,
  Warehouse,
} from '@/types/hubProductAnalyzer';

/** Payload de l'événement `analyze:start` (analyse par code eBatPro). */
export type StartAnalyzePayload = {
  codeEbat: string;
  warehouse?: Warehouse;
  /** Distributeur cible (prioritaire sur `warehouse`) : son compte eBatPro est interrogé. */
  distributorId?: string;
  forceReanalyze?: boolean;
  /** Analyse forcée d'un produit déjà au catalogue : ligne de trace verrouillée. */
  forceCatalogue?: boolean;
  skipWeight?: boolean;
};

/** Payload de l'événement `analyze:start-by-ean`. */
export type StartByEanPayload = {
  ean: string;
  warehouse?: string;
  distributorId?: string;
  forceReanalyze?: boolean;
  forceCatalogue?: boolean;
  estimatedBuyPriceHT?: number;
  stagingId?: string;
  skipWeight?: boolean;
};

/** Ce que l'utilisateur demande d'analyser, et ce qu'il faut en faire une fois fini. */
export type AnalyzeRequest = {
  /** Libellé affiché pendant l'analyse (désignation, code ou EAN saisi). */
  label: string;
  start:
    | { type: 'ebat'; payload: Omit<StartAnalyzePayload, 'skipWeight'> }
    | { type: 'ean'; payload: Omit<StartByEanPayload, 'skipWeight'> };
  /** Ignorer la saisie du poids (poids 0, à renseigner ensuite sur la fiche). */
  skipWeight: boolean;
  /** Affaire à laquelle rattacher le produit une fois analysé. */
  affaireId?: string | null;
  /** Entrepôt utilisé pour ce rattachement (repli Dombasle, comme le web). */
  warehouse?: Warehouse | null;
  /** Opportunité d'origine : transmise à la fiche pour la marquer « lancée » après le lancement. */
  opportunityUuid?: string | null;
};

export type SingleRunPhase =
  | 'idle'
  /** Demande envoyée, le serveur n'a pas encore répondu. */
  | 'pending'
  | 'running'
  /** Terminée : la fiche s'ouvre dans un instant. */
  | 'completing'
  | 'failed'
  | 'cancelled'
  | 'blocked'
  | 'already_analyzed'
  | 'reused'
  | 'ebat_not_found'
  /** Connexion perdue pendant l'analyse : le back ne reprend pas un job en cours. */
  | 'interrupted';

export type WeightRequest = {
  jobId: string;
  field: string;
  context: Record<string, unknown> | null;
  /** Instant (ms) où le serveur renonce et utilise 0 g. */
  deadline: number;
};

/** Étapes et ventes marketplace du job en cours (analyse unitaire ou élément de file). */
export type LiveJob = {
  jobId: string | null;
  steps: Record<string, StepData>;
  mpData: Record<string, StepData>;
  startedAt: number | null;
};

export type SingleRunState = {
  phase: SingleRunPhase;
  /** Incrémenté à chaque lancement : les écrans détectent une nouvelle analyse. */
  runId: number;
  request: AnalyzeRequest | null;
  errors: string[];
  stagingId: string | null;
  result: FullResult | null;
  blocked: BlockedData | null;
  alreadyAnalyzed: AlreadyAnalyzedData | null;
  reused: AnalysisReusedData | null;
  weight: WeightRequest | null;
  elapsedMs: number;
};

export type QueueItemStatus =
  | 'pending'
  | 'analyzing'
  | 'done'
  | 'error'
  | 'blocked'
  | 'ebat_not_found';

/** Un produit à analyser dans la file. */
export type QueueSeed = {
  /** Référence affichée (code eBatPro ou EAN). */
  ref: string;
  label?: string | null;
  refType: 'ebatpro' | 'ean';
  code: string;
  warehouse?: Warehouse | null;
  distributorId?: string | null;
  estimatedBuyPriceHT?: number | null;
  forceCatalogue?: boolean;
  /** Ligne de la réserve détenue pour ce produit (markDone / markFailed). */
  reserveUuid?: string | null;
  affaireId?: string | null;
  /** Staging déjà existant (relance depuis l'historique). */
  stagingUuid?: string | null;
};

export type QueueItem = QueueSeed & {
  id: string;
  status: QueueItemStatus;
  stagingId: string | null;
  errorMsg: string | null;
  elapsedMs: number;
};

export type QueueSource = 'rerun' | 'reserve';

export type QueueState = {
  /** Une file est affichée (en cours ou terminée, tant qu'elle n'est pas fermée). */
  open: boolean;
  /** Une analyse de la file est en cours ou en attente. */
  running: boolean;
  source: QueueSource;
  items: QueueItem[];
  currentIdx: number;
  startedAt: number | null;
  /** Les lignes de réserve ont été rendues (app en arrière-plan) : à reprendre au retour. */
  reserveReleased: boolean;
};

export type ConnectionState = {
  connected: boolean;
  error: string | null;
};

export type EngineState = {
  connection: ConnectionState;
  live: LiveJob;
  single: SingleRunState;
  queue: QueueState;
};

export const SOCKET_DOWN_MESSAGE =
  "Connexion au serveur d'analyse indisponible — réessayez dans quelques secondes.";
export const START_TIMEOUT_MESSAGE =
  "Le serveur d'analyse n'a pas répondu — relancez l'analyse.";
export const INTERRUPTED_MESSAGE =
  "L'analyse a été interrompue (connexion perdue ou application passée en arrière-plan).";
