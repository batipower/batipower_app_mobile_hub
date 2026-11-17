import type { StudioTab } from './hubStudio';

/** Un critère de mise en ligne (checklist de la relecture). */
export interface StudioDeployCheck {
  key: 'brand' | 'images' | 'imageHd' | 'attributes' | 'originality' | 'score' | 'geo' | 'sellable';
  label: string;
  ok: boolean;
  /** Que faire, et où (uniquement si le critère n'est pas rempli). */
  hint?: string;
  /** Onglet du Studio où se corrige le critère (absent : pas de correction possible dans le Studio). */
  tab?: StudioTab;
  /** Élément à mettre en évidence dans l'onglet. */
  target?: string;
  /** Libellé court du bouton d'action. */
  actionLabel?: string;
}

/** Contrôle de mise en ligne calculé par le serveur avant tout déploiement. */
export interface StudioDeployReadiness {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  /** Mêmes constats que `blockers` et `warnings`, expliqués (titre, détail, action). Absent d'un ancien serveur. */
  issues?: StudioIssue[];
  checks: StudioDeployCheck[];
  score: { current: number | null; projected: number | null; min: number };
}

export type StudioIssueSeverity = 'blocker' | 'warning' | 'info';

/** Une anomalie expliquée par le serveur, en français : ce qui se passe, la cause chiffrée et que faire. */
export interface StudioIssue {
  /** Code stable (filtres, statistiques) : ne jamais l'afficher tel quel. */
  code: string;
  severity: StudioIssueSeverity;
  /** Champ de la fiche concerné, quand il y en a un. */
  field?: string;
  title: string;
  detail: string;
  action: string;
  /** Corrigée seule par le système : aucune intervention nécessaire. */
  autoFixed?: boolean;
  /** Onglet du Studio où se corrige l'anomalie (absent : pas de correction possible dans le Studio). */
  tab?: StudioTab;
  /** Élément à mettre en évidence dans l'onglet. */
  target?: string;
  /** Libellé court du bouton d'action. */
  actionLabel?: string;
}

/** `READY` : peut être déployée. `ATTENTION` : déployable, points à relire. `BLOCKED` : à corriger d'abord. */
export type StudioPreflightVerdict = 'READY' | 'ATTENTION' | 'BLOCKED';

/** Contrôle avant déploiement d'une fiche, calculé par le serveur sans coût d'IA. */
export interface StudioPreflight {
  verdict: StudioPreflightVerdict;
  issues: StudioIssue[];
  checks: StudioDeployCheck[];
  score: { current: number | null; projected: number | null; min: number } | null;
  checkedAt: string;
}

export interface StudioReviewSummary {
  ready: number;
  attention: number;
  blocked: number;
  /** Pas encore contrôlées. */
  unchecked: number;
}

/** Résultat d'un envoi groupé (préparation ou déploiement de plusieurs fiches). */
export interface StudioBulkOutcome {
  /** Identifiant du lancement groupé (suivi via `hubProductStudioJobsApi.batch`). */
  batchId?: string;
  total: number;
  created: number;
  alreadyActive: number;
  invalid: { reference: string; reason: string }[];
  blocked: { reference: string; reasons: string[] }[];
  failed: { reference: string; reason: string }[];
}

export type StudioJobType = 'PREPARE' | 'DEPLOY';
export type StudioJobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
export type StudioJobStepStatus = 'waiting' | 'running' | 'done' | 'error' | 'skipped';

export interface StudioJobStep {
  key: string;
  label: string;
  status: StudioJobStepStatus;
  detail?: string;
  at?: string;
}

/** Résumé d'un job terminé. Le back n'y met jamais de prix d'achat ni de marge. */
export interface StudioJobResult {
  draftStatus?: string | null;
  projectedScore?: number | null;
  score?: number | null;
  apply?: { logId: string | null; partial: boolean } | null;
  geo?: { published: boolean; skipped: string | null } | null;
  activation?: { activated: boolean; alreadyActive: boolean } | null;
  merchant?: { status: string; error: string | null; merchantCenterUrl: string | null } | null;
  warnings?: string[];
  missing?: string[];
  /** Anomalies expliquées par le serveur (absent d'un job créé avant le contrôle préalable). */
  issues?: StudioIssue[];
  /** Verdict du contrôle fait à la fin de la préparation. */
  preflight?: { verdict: StudioPreflightVerdict; checkedAt: string } | null;
}

/**
 * Critères des filtres de la page de file, lus sur le catalogue. Jamais de prix, de marge ni de quantité :
 * seule la présence de stock est exposée. Absents d'un back plus ancien : le filtre correspondant n'exclut alors rien.
 */
export interface StudioFacets {
  brand?: string | null;
  /** Service (`CategoryType` du catalogue : ELECTRICITE, PLOMBERIE…). */
  categoryType?: string | null;
  affaires?: { id: string; name: string }[];
  stock?: { flevy: boolean; dombasle: boolean; qg: boolean };
}

export interface StudioJob extends StudioFacets {
  id: string;
  reference: string;
  type: StudioJobType;
  status: StudioJobStatus;
  /** Identité du demandeur : masquée (`null`) pour un job qui n'est pas le sien, sauf SUPERADMIN. */
  requestedByUserId: string | null;
  requestedByEmail: string | null;
  requestedByRole: string | null;
  /** Heure de la demande. */
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  steps: StudioJobStep[] | null;
  currentStep: string | null;
  progress: number;
  error: string | null;
  result: StudioJobResult | null;
  /** Options de la demande (ex. `forceGeo`), jamais de donnée sensible. */
  options?: StudioDeployOptions | null;
  isMine: boolean;
  seen: boolean;
  /** 1 = prochain à passer ; uniquement pour un job `QUEUED`. */
  queuePosition: number | null;
}

/** Options d'un déploiement mis en file. */
export interface StudioDeployOptions {
  /** Écrase un GEO publié plus riche (recalcul explicite du GEO). */
  forceGeo?: boolean;
}

export interface StudioJobEnqueueResponse {
  /** `false` : un job était déjà actif pour ce produit, c'est lui qui est renvoyé. */
  created: boolean;
  job: StudioJob;
}

export interface StudioJobCurrentResponse {
  job: StudioJob | null;
}

export interface StudioJobListResponse {
  items: StudioJob[];
}

export interface StudioJobNotificationsResponse {
  items: StudioJob[];
  count: number;
}

/** Historique d'un produit : son dernier job terminé, le nombre de passages et son dernier déploiement réussi. */
export interface StudioProductHistory {
  job: StudioJob;
  runs: number;
  lastDeployedAt: string | null;
}

export interface StudioQueueOverview {
  running: StudioJob[];
  queued: StudioJob[];
  history: StudioJob[];
  /** Historique regroupé par produit, du plus récent au plus ancien. Absent d'un back plus ancien. */
  products?: StudioProductHistory[];
  concurrency: number;
}

/** `TO_APPLY` : préparée, contenu pas encore écrit. `TO_ACTIVATE` : contenu appliqué, produit pas encore en ligne. */
export type StudioReviewStage = 'TO_APPLY' | 'TO_ACTIVATE';

/** Fiche prête à être relue (colonne « À relire » de la page de file). Sans prix d'achat ni marge. */
export interface StudioReviewItem extends StudioFacets {
  reference: string;
  designation: string | null;
  stage: StudioReviewStage;
  draftStatus: string;
  preparedAt: string | null;
  appliedAt: string | null;
  currentScore: number | null;
  projectedScore: number | null;
  fields: { accepted: number; edited: number; rejected: number; pending: number };
  warningsCount: number;
  /** Étapes de relecture validées dans le Studio, sur `stepsTotal`. Absent d'un back plus ancien. */
  stepsValidated?: number;
  stepsTotal?: number;
  requestedByEmail: string | null;
  requestedAt: string | null;
  /** Un job est déjà en file ou en cours pour cette référence. */
  busy: boolean;
  /** Critères de mise en ligne non remplis (vide : déployable). Vide aussi si le serveur ne les fournit pas encore. */
  deployBlockers?: string[];
  deployWarnings?: string[];
  deployChecks?: StudioDeployCheck[];
  /** Contrôle avant déploiement : `null` tant que la fiche n'a pas été contrôlée ; absent d'un back plus ancien. */
  preflight?: StudioPreflight | null;
}

export interface StudioReviewResponse {
  items: StudioReviewItem[];
  count: number;
  /** Absent d'un back plus ancien : l'interface masque alors les compteurs et le déploiement groupé. */
  summary?: StudioReviewSummary;
}

// ─── Lancement groupé depuis Pricing ───

export type StudioEstimateGrade = 'A' | 'B' | 'C' | 'D';
export type StudioEstimateAxisKey = 'description' | 'seo' | 'images' | 'geo';
export type StudioEstimateAlertCode = 'NEVER_SCORED' | 'ALREADY_RUNNING' | 'IMAGES_BLOCK' | 'STAYS_OFFLINE';

export interface StudioEstimateAlert {
  code: StudioEstimateAlertCode;
  severity: 'info' | 'warning' | 'blocker';
  label: string;
}

export interface StudioEstimateItem {
  reference: string;
  currentScore: number | null;
  currentGrade: StudioEstimateGrade | null;
  estimatedScore: number | null;
  estimatedGrade: StudioEstimateGrade | null;
  gain: number | null;
  gainByAxis: Record<StudioEstimateAxisKey, number>;
  /** `draft` : note projetée réelle d'un brouillon déjà préparé ; `estimate` : calcul sans IA. */
  source: 'draft' | 'estimate' | 'none';
  active: boolean | null;
  alerts: StudioEstimateAlert[];
  likelyPublishable: boolean;
}

export interface StudioEstimateSummary {
  total: number;
  scored: number;
  averageCurrent: number | null;
  averageEstimated: number | null;
  likelyPublishable: number;
  likelyBlocked: number;
  alreadyRunning: number;
  neverScored: number;
}

export interface StudioEstimateResponse {
  items: StudioEstimateItem[];
  summary: StudioEstimateSummary;
  invalid: { reference: string; reason: string }[];
}

export type StudioBatchStage =
  | 'QUEUED'
  | 'PREPARING'
  | 'DEPLOYING'
  | 'PUBLISHED'
  | 'TO_REVIEW'
  | 'FAILED'
  | 'CANCELLED';

export interface StudioBatchItem {
  reference: string;
  stage: StudioBatchStage;
  progress: number;
  currentStep: string | null;
  scoreBefore: number | null;
  scoreProjected: number | null;
  scoreFinal: number | null;
  reasons: string[];
  error: string | null;
}

export interface StudioBatchStatus {
  batchId: string;
  items: StudioBatchItem[];
  counters: Record<StudioBatchStage, number>;
  total: number;
  finished: boolean;
  startedAt: string;
}
