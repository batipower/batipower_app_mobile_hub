import type {
  BatchCheckItem,
  BatchItem,
  FullResult,
  StepData,
  StepStatus,
  Warehouse,
} from '@/types/hubProductAnalyzer';

export type RevealPhase = 'idle' | 'completing' | 'revealed';

export type MpLaunchStatus = 'idle' | 'loading' | 'success' | 'error' | 'skipped';
export type MpCountry = 'FR' | 'BE' | 'ES' | 'IT' | 'DE';

export type DeployMpResult = {
  status: 'success' | 'error' | 'skipped';
  priceTTC?: number;
  error?: string;
};

/** Réponse de `POST staging/:id/launch-and-deploy`. */
export type LaunchAndDeployResponse = {
  launch?: {
    success?: boolean;
    message?: string;
    batipowerId?: number | null;
    adopted?: boolean;
    reference?: string;
  };
  equilibriumComputed?: boolean;
  deploy?: Record<string, DeployMpResult> | null;
  note?: string;
};

export type BatchCheckItemExt = BatchCheckItem & {
  reserveAffaireId?: string | null;
  reserveAffaireName?: string | null;
  reservePriority?: string | null;
  overrideAffaireId?: string | null;
  /** Ligne de réserve déjà au catalogue : analyse forcée en ligne de trace, sans confirmation. */
  reserveForceCatalogue?: boolean;
};

export type BatchItemExt = BatchItem & {
  resolvedAffaireId?: string | null;
};

export type ReserveTrackCounters = { enAttente: number; enCours: number; terminees: number };

export type ReserveStats = {
  totalEnAttente: number;
  totalPrioritaires?: number;
  sansAffaire?: number;
  /** Prioritaires en attente par voie (onglets « Réserve » / « Réserve destockage »). */
  prioritairesParVoie?: { STANDARD: number; DISTRIBUTOR_CLEARANCE: number };
  parAffaire?: {
    affaireId: string;
    name: string;
    count: number;
    /** Détail par voie du compteur de l'affaire. */
    parVoie?: { STANDARD: number; DISTRIBUTOR_CLEARANCE: number };
  }[];
  /** Compteurs par voie (produits lambda / destockage distributeur). */
  parVoie?: { STANDARD: ReserveTrackCounters; DISTRIBUTOR_CLEARANCE: ReserveTrackCounters };
  parDistributeur?: ({ distributorId: string; name: string | null } & ReserveTrackCounters)[];
  parLot?: ({
      uploadUuid: string | null;
      fileName: string | null;
      uploadedByEmail: string | null;
      createdAt: string | null;
      distributorId: string | null;
      distributorName: string | null;
      /** Postes (ordinateurs / onglets) qui analysent ce lot en ce moment (heartbeat récent). */
      postesActifs?: number;
    } & ReserveTrackCounters)[];
  /** Postes actifs sur l'ensemble de la réserve. */
  postesActifs?: number;
};

export type ReserveAddResult = {
  added: number;
  /** Destockage : produits déjà analysés / au catalogue, offre + DEP ajoutés pour ce distributeur. */
  ajoutOffre?: number;
  /** Destockage : produits déjà au catalogue envoyés en analyse forcée (ligne de trace). */
  traced?: number;
  /** Destockage : produits déjà analysés / tracés rattachés à l'affaire. */
  linked?: number;
  skipped: {
    duplicateInFile: number;
    inReserve: number;
    alreadyAnalyzed: number;
    inCatalogue: number;
  };
};

export type EbatSearchHit = {
  id?: string;
  sku: string;
  manufacturerSku?: string;
  ean?: string;
  name?: string;
  brand?: string;
  purchasePriceHT?: number | null;
  publicPriceHT?: number | null;
  stocks?: { warehouse: string; quantity: number; warehouseCode?: string }[];
};

export type LaunchFromStagingResult = {
  success: boolean;
  batipowerId: number | null;
  priceHTUsed?: number;
  purchasePriceHTUsed?: number;
  note?: string;
  message?: string;
  referenceUsed?: string;
  referenceIsEan?: boolean;
};

export type MpLaunchConfig = {
  amazon: { enabled: boolean; margin: number; priceTTC: number };
  manomano: { enabled: boolean; margin: number; priceTTC: number };
  leroymerlin: { enabled: boolean; margin: number; priceTTC: number };
};

export type ResumeSession = {
  items: BatchItemExt[];
  affaireId: string | null;
  skipWeight: boolean;
  doneCount: number;
  totalCount: number;
};

export type AnalysisCompletePayload = {
  jobId: string;
  success?: boolean;
  reason?: string;
  error?: string | null;
  result: FullResult | null;
  stagingId: string | null;
};

export type AnalysisStepPayload = {
  jobId: string;
  step: string;
  status: StepStatus;
  data?: Record<string, unknown>;
};

export type AnalysisErrorPayload = {
  jobId: string;
  step: string;
  message: string;
  fatal: boolean;
};

export type AnalysisInputRequiredPayload = {
  jobId: string;
  field: string;
  context?: Record<string, unknown>;
  timeoutMs?: number;
};

export type StepsMap = Map<string, StepData>;

export const DESTINATION_COUNTRIES: { code: MpCountry; label: string; flag: string }[] = [
  { code: 'FR', label: 'France', flag: '🇫🇷' },
  { code: 'BE', label: 'Belgique', flag: '🇧🇪' },
  { code: 'ES', label: 'Espagne', flag: '🇪🇸' },
  { code: 'IT', label: 'Italie', flag: '🇮🇹' },
  { code: 'DE', label: 'Allemagne', flag: '🇩🇪' },
];

export const VAT_RATES: Record<MpCountry, number> = {
  FR: 1.2,
  BE: 1.21,
  ES: 1.21,
  IT: 1.22,
  DE: 1.19,
};

export function getVatRate(country: MpCountry = 'FR'): number {
  return VAT_RATES[country] ?? 1.2;
}

export type BatchRefType = 'ebatpro' | 'manufacturer' | 'ean';

export function warehouseOrDefault(value: string | null | undefined): Warehouse {
  if (value === 'FLEVY' || value === 'NICODEME') return value;
  return 'DOMBASLE';
}
