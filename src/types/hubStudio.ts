/**
 * Types du Product Studio (préparation IA de la fiche site) de la fiche produit
 * HUB — miroir de `back-api-power/src/core/product-studio/product-studio.types.ts`
 * et de la façade `hub-app/products/:reference/studio`.
 */

import type { StudioDeployReadiness } from './hubStudioJobs';

export type StudioFieldKey =
  | 'name'
  | 'description'
  | 'descriptionShort'
  | 'linkRewrite'
  | 'metaTitle'
  | 'metaDescription'
  | 'metaKeywords';

export type StudioFieldDecision = 'PENDING' | 'ACCEPTED' | 'EDITED' | 'REJECTED';
export type StudioFieldMode = 'SKIP' | 'ADJUST' | 'GENERATE';

/** Pourquoi le système a posé (ou changé) la décision d'un champ (miroir du back). */
export type StudioDecisionCause =
  | 'CROSSCHECK_LOW'
  | 'CROSSCHECK_OK'
  | 'UNCHANGED'
  | 'MANUAL_CONTENT'
  | 'SHORT_TOO_SHORT'
  | 'AUTO_ACCEPT_RICHER'
  | 'AUTO_ACCEPT_GENERATED'
  | 'KEYWORDS_PRESENT'
  | 'PREFLIGHT_REGRESSION'
  | 'PREFLIGHT_MANUAL_SITE';

export interface StudioFieldReason {
  /** Motif du mode calculé à la préparation (texte technique du back, utilisé en repli). */
  modeReason?: string;
  /** AUTO : décision posée par le système ; USER : par un utilisateur. */
  source: 'AUTO' | 'USER';
  cause?: StudioDecisionCause;
  /** Confiance de la relecture IA (0 à 1), quand elle est en cause. */
  confidence?: number;
}

export type StudioTab = 'contenu' | 'attributs' | 'images' | 'geo' | 'associes' | 'categories';

/** Étape du parcours de relecture : les 6 onglets à valider, puis le déploiement. */
export type StudioStepId = StudioTab | 'deployer';

export type StudioStepStatus = 'waiting' | 'running' | 'done' | 'error' | (string & {});

export interface StudioAttribute {
  canonicalName: string;
  value: string;
  unit?: string;
  evidenceRef?: string;
  selected?: boolean;
}

export interface StudioGeoFaqItem {
  question: string;
  answer: string;
  source?: string;
}

export interface StudioGeoContent {
  introHtml?: string;
  faq?: StudioGeoFaqItem[];
}

export type StudioAccessoryReason = 'achete_avec' | 'meme_gamme' | 'deja_associe';

export interface StudioAccessoryProposal {
  reference: string;
  productId?: number;
  name?: string;
  imageUrl?: string;
  reason: StudioAccessoryReason;
  score: number;
  selected: boolean;
}

export interface StudioCategoryProposalItem {
  categoryId: number;
  path: string;
  name: string;
  reason: string;
  selected: boolean;
}

export interface StudioCategoryProposal {
  currentIds: number[];
  currentDefaultId?: number;
  items: StudioCategoryProposalItem[];
  suggestedDefaultId?: number;
  applyDefault: boolean;
  defaultReason?: string;
  /** État final exact des catégories relu dans l'arbre complet (ajouts ET retraits). Absent : mode additif. */
  finalIds?: number[];
  /** Catégorie principale choisie avec `finalIds`. */
  defaultId?: number;
}

/** Nœud de l'arbre des catégories PrestaShop (actives, hors racine et accueil). */
export interface StudioCategoryNode {
  id: number;
  name: string;
  idParent?: number;
  level?: number;
  position?: number;
  active: boolean;
}

export interface StudioCategoryDecision {
  finalIds: number[];
  defaultId: number;
}

export interface StudioImagePlanItem {
  viewType: string;
  source?: string;
  legend?: string;
  altText?: string;
  generable?: boolean;
  hint?: string;
  reason?: string;
}

export type StudioBrandStatus = 'ALREADY_ATTACHED' | 'ATTACH' | 'CREATE' | 'NONE';
export type StudioBrandDecision = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface StudioBrandProposal {
  status: StudioBrandStatus;
  current?: { id: number; name: string };
  ebatName?: string;
  ebatLogoUrl?: string;
  logoDataUrl?: string;
  logoUploaded?: boolean;
  match?: { id: number; name: string };
  createName?: string;
}

/** Contenu proposé par la génération (clés alignées sur `ProposedContent` du back). */
export interface StudioProposedContent {
  name?: string;
  linkRewrite?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  descriptionShort?: string;
  descriptionHtml?: string;
  attributes?: StudioAttribute[];
  geo?: StudioGeoContent;
  accessoryProposals?: StudioAccessoryProposal[];
  categoryProposal?: StudioCategoryProposal;
  brandProposal?: StudioBrandProposal;
}

export interface StudioImageAsset {
  id: string;
  prestashopImageId?: number | null;
  viewType?: string;
  width?: number;
  height?: number;
  isCover?: boolean;
  defects?: string[] | Record<string, unknown> | null;
  origin?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
}

export interface StudioApplyLog {
  id?: string;
  dryRun?: boolean;
  rolledBack?: boolean;
  success?: boolean;
}

export interface StudioScoreSnapshot {
  score: number;
  grade?: string;
}

export interface StudioUniqueness {
  score?: number;
  blocking?: boolean;
}

export interface StudioFact {
  key: string;
  value: string | number;
}

export interface StudioDraft {
  id: string;
  reference: string;
  prestashopProductId: number | null;
  status: string;
  proposed: StudioProposedContent | null;
  validated: Partial<StudioProposedContent> | null;
  fieldModes: Record<string, StudioFieldMode | string> | null;
  fieldDecisions: Partial<Record<StudioFieldKey | 'brand', StudioFieldDecision | StudioBrandDecision>> | null;
  /** Absent des brouillons préparés avant l'introduction du suivi des causes. */
  fieldReasons?: Partial<Record<StudioFieldKey, StudioFieldReason>> | null;
  /** Étapes de relecture validées (clé = onglet du Studio). Absent des brouillons antérieurs à cette fonction. */
  stepValidations?: Partial<Record<StudioTab, { at: string; by: string | null }>> | null;
  factSheet: { facts?: StudioFact[] } | null;
  currentScore: StudioScoreSnapshot | null;
  projectedScore: StudioScoreSnapshot | null;
  uniqueness: StudioUniqueness | null;
  crossCheck: { issues?: string[] } | null;
  imagePlan: StudioImagePlanItem[] | null;
  missingEvidence: { path?: string; reason?: string }[] | null;
  editorialFlags: string[] | null;
  lastError: string | null;
  preparedAt?: string | null;
  imageAssets?: StudioImageAsset[];
  applyLogs?: StudioApplyLog[];
  brandProposal?: StudioBrandProposal | null;
  brandDecision?: StudioBrandDecision;
  /** Calculée par le back : le jeton de prévisualisation n'est jamais exposé. */
  previewUrl: string | null;
}

export interface StudioPublishGate {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

export interface StudioScores {
  current: StudioScoreSnapshot | null;
  projected: StudioScoreSnapshot | null;
  gate: StudioPublishGate | null;
  /** Contrôle de mise en ligne du serveur (même règle que le déploiement en file). */
  readiness?: StudioDeployReadiness | null;
}

export interface StudioManufacturer {
  id: number;
  name: string;
}

export interface StudioImageImportResult {
  url: string;
  status: 'imported' | 'rejected';
  reason?: string;
}

export interface StudioImageImportResponse {
  draft: StudioDraft;
  results: StudioImageImportResult[];
}

export interface StudioApplyGeoResult {
  published?: boolean;
  /** `intro_plus_riche` : un GEO plus complet est déjà en ligne ; sinon cause de non-publication. */
  skipped?: string;
  error?: string;
}

export interface StudioApplyResponse {
  dryRun?: boolean;
  logId?: string;
  error?: string;
  geo?: StudioApplyGeoResult;
  partial?: boolean;
  warnings?: string[];
}

export type StudioBrandAction = 'ACCEPT' | 'REJECT' | 'ATTACH' | 'CREATE';

/** Lien public de la fiche (`studio/public-link`) : uniquement l'état en ligne et l'URL du site. */
export interface StudioPublicLink {
  found: boolean;
  active: boolean;
  publicUrl: string | null;
}

/** Champs modifiables en édition rapide de la fiche site. */
export type StudioQuickSaveField =
  | 'name'
  | 'description'
  | 'descriptionShort'
  | 'linkRewrite'
  | 'metaTitle'
  | 'metaDescription';

/** Contenu actuellement publié (`studio/site-content`). */
export interface StudioSiteContent extends Record<StudioQuickSaveField, string> {
  active: boolean;
}

export type StudioQuickSavePayload = Partial<Record<StudioQuickSaveField, string>>;

export interface StudioQuickSaveResponse {
  changed: boolean;
  fields: string[];
  logId?: string;
  slugRedirect?: { productId: number; from: string; to: string };
  structuration?: { ok: boolean; error?: string };
}
