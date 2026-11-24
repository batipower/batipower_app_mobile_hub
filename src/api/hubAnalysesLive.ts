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

export interface LiveSnapshot {
  generatedAt: string;
  analyses: LiveAnalysis[];
  postes: LivePoste[];
}

type ControlResult = { ok: boolean; control: PosteControl };

/**
 * Analyses en cours des postes (pipeline Product Analyzer) et arrêt / relance à distance d'un
 * poste. Pendant mobile de `hub-analyses-live.ts` du web ; routes réservées au SUPERADMIN.
 */
export const hubAnalysesLiveApi = {
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
