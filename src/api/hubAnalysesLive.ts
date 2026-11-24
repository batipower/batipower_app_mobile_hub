import { apiClient } from '@/api/client';

export type PosteControl = 'RUNNING' | 'PAUSED';

/** Une analyse produit en cours (pipeline `/product-analyzer`). */
export interface LiveAnalysis {
  jobId: string;
  kind: 'CODE' | 'EAN';
  /** Code interne eBatPro ou EAN analysé. */
  ref: string;
  warehouse: string | null;
  distributorName: string | null;
  startedAt: string;
  updatedAt: string;
  currentStep: string | null;
  currentStatus: string | null;
  completedSteps: string[];
  totalMainSteps: number;
  /** Clé du poste qui analyse (`unidentified` si inconnu). */
  posteKey: string;
  reserveUuid: string | null;
}

export interface LiveReserveLine {
  uuid: string;
  ean: string | null;
  codeEbat: string | null;
  designation: string | null;
  brand: string | null;
  claimedAt: string | null;
  heartbeatAt: string | null;
  affaireName: string | null;
  fileName: string | null;
  /** Une analyse en cours porte actuellement cette ligne. */
  analysing: boolean;
}

export interface LivePoste {
  key: string;
  identified: boolean;
  user: { id: string | null; name: string | null; email: string | null } | null;
  device: { browser: string; os: string; label: string } | null;
  /** Lignes de la réserve déjà analysées par ce poste depuis le début de sa sélection. */
  done: number;
  /** Lignes encore détenues par le poste. */
  enCours: number;
  /** Total sélectionné par le poste : analysées + encore détenues. */
  total: number;
  percent?: number;
  /** Rang de la ligne en cours d'analyse (analysées + 1), null si aucune analyse ne tourne. */
  currentPosition?: number | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  heartbeatAt: string | null;
  /** `PAUSED` : poste arrêté à distance (file gelée, lignes conservées). */
  control?: PosteControl;
  pausedAt?: string | null;
  pausedBy?: string | null;
  lines: LiveReserveLine[];
  linesTruncated: boolean;
}

/** Contribution d'un poste à l'avancement d'une affaire. */
export interface LiveAffairePoste {
  key: string;
  done: number;
  enCours: number;
}

/** Avancement d'une affaire : lignes de réserve prises en charge par les postes, regroupées par affaire. */
export interface LiveAffaire {
  /** `null` : lignes sans affaire. */
  id: string | null;
  name: string;
  /** Rang dans le classement de la réserve, `null` si non classée. */
  rank: number | null;
  done: number;
  enCours: number;
  total: number;
  percent: number;
  /** Une analyse tourne actuellement sur une ligne de cette affaire. */
  analysing: boolean;
  postes: LiveAffairePoste[];
}

export interface LiveSnapshot {
  generatedAt: string;
  analyses: LiveAnalysis[];
  postes: LivePoste[];
  /** Avancement par affaire (absent des anciennes versions du back : reconstitué depuis les lignes des postes). */
  affaires?: LiveAffaire[];
  /** Identité du process API : un changement = l'API a redémarré. */
  serverBootId?: string;
  serverStartedAt?: string;
  /** Numéro d'ordre des snapshots poussés par le temps réel (absent de la lecture HTTP). */
  seq?: number;
}

/** Ticket de 2 min pour le canal temps réel `/analyses-live` (SUPERADMIN). */
export interface LiveWsTicket {
  wsUrl: string;
  token: string;
  expiresIn?: number;
  status: string;
}

type ControlResult = { ok: boolean; control: PosteControl };

/**
 * Analyses en cours des postes (pipeline Product Analyzer) et arrêt / relance à distance d'un
 * poste. Pendant mobile de `hub-analyses-live.ts` du web ; routes réservées au SUPERADMIN.
 */
export const hubAnalysesLiveApi = {
  getWsTicket() {
    return apiClient.get<LiveWsTicket>('hub-app/product-analyzer/live/ws-ticket');
  },

  get({ signal }: { signal?: AbortSignal } = {}) {
    return apiClient.get<LiveSnapshot>('hub-app/product-analyzer/live', { signal });
  },

  /** Coupe les analyses en vol du poste et gèle sa file (lignes de réserve conservées). */
  pausePoste(posteKey: string) {
    return apiClient.post<ControlResult>(
      `hub-app/product-analyzer/live/postes/${encodeURIComponent(posteKey)}/pause`,
      {},
    );
  },

  /** Relance un poste arrêté : sa file reprend là où elle s'était arrêtée. */
  resumePoste(posteKey: string) {
    return apiClient.post<ControlResult>(
      `hub-app/product-analyzer/live/postes/${encodeURIComponent(posteKey)}/resume`,
      {},
    );
  },
};
