/** Types du Product Studio (lancement groupé des fiches produit), alignés sur le back `hub-app/product-studio`. */

/** Résultat d'un envoi groupé (préparation de plusieurs fiches). */
export interface StudioBulkOutcome {
  /** Identifiant du lancement groupé. */
  batchId?: string;
  total: number;
  created: number;
  alreadyActive: number;
  invalid: { reference: string; reason: string }[];
  blocked: { reference: string; reasons: string[] }[];
  failed: { reference: string; reason: string }[];
}

export type StudioEstimateGrade = 'A' | 'B' | 'C' | 'D';
export type StudioEstimateAxisKey = 'description' | 'seo' | 'images' | 'geo';
export type StudioEstimateAlertCode =
  | 'NEVER_SCORED'
  | 'ALREADY_RUNNING'
  | 'IMAGES_BLOCK'
  | 'STAYS_OFFLINE';

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
  /** `draft` : note projetée d'un brouillon déjà préparé ; `estimate` : calcul sans IA. */
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
