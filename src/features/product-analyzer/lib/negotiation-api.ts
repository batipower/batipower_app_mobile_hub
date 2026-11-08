import { CATEGORY_TYPE_VALUES, type CategoryTypeEnum } from '@/types/discussions';

/**
 * Code d'entrepôt destinataire : valeur de l'enum historique (FLEVY, DOMBASLE…) ou code d'un entrepôt
 * créé dans l'ADMIN (ex. LILLE).
 */
export type NegotiationWarehouse = string;

export type NegotiationCategoryType = CategoryTypeEnum;

const CATEGORY_TYPE_LABELS: Record<CategoryTypeEnum, string> = {
  ELECTRICITE: 'Électricité',
  VENTILATION: 'Ventilation',
  PLOMBERIE: 'Plomberie',
  CHAUFFAGE: 'Chauffage',
  SANITAIRE: 'Sanitaire',
  OUTILLAGE: 'Outillage',
  CARRELAGE: 'Carrelage',
  PHOTO: 'Photo',
};

export const NEGOTIATION_CATEGORY_TYPES: readonly {
  value: NegotiationCategoryType;
  label: string;
}[] = CATEGORY_TYPE_VALUES.map((value) => ({
  value,
  label: CATEGORY_TYPE_LABELS[value],
}));

export interface PreviewReferent {
  id: string;
  name: string;
  code: string | null;
  warehouse: NegotiationWarehouse | null;
  categoryTypes: string[];
  matchedByOverride: boolean;
}

export interface PreviewItem {
  stagingUuid: string;
  warehouse: NegotiationWarehouse;
  brands: string[];
  categoryTypes: string[];
  referents: PreviewReferent[];
  overriddenServices: string[];
  overridesIgnoredForWarehouseMismatch: string[];
}

export interface EligibleReferentsResult {
  warehouse: NegotiationWarehouse;
  categoryType: NegotiationCategoryType;
  referents: PreviewReferent[];
  overriddenServices: string[];
  overridesIgnoredForWarehouseMismatch: string[];
}

export interface AssignNegotiationItem {
  stagingUuid: string;
  requestedMinPriceHT: number;
  operatorComment?: string;
  categoryTypeOverride?: NegotiationCategoryType;
}

export interface AssignNegotiationBulkBody {
  items: AssignNegotiationItem[];
  operatorLabel?: string;
}

export interface OpportunityAssignmentResult {
  stagingUuid: string;
  opportunityUuid: string;
  warehouse: NegotiationWarehouse;
  createdAssignments: number;
  referents: PreviewReferent[];
  /**
   * Aucun RA / RAR actif à la création : la demande est créée quand même et sera visible dès
   * l'inscription d'un compte éligible (entrepôt / filiale + service).
   */
  pendingReferents?: boolean;
  updatedExisting?: boolean;
}

export interface BulkAssignResult {
  assigned: OpportunityAssignmentResult[];
  failed: { stagingUuid: string; reason: string; code: string }[];
}

/** Résumé renvoyé par GET negotiation/by-staging (vue opérateur hub). */
export interface NegotiationOpportunitySummary {
  uuid: string;
  stagingUuid: string;
  designation: string | null;
  status: string;
  /** Prix exposé. Sur une DEP : brut moins la remise DEP du fournisseur (10 % par défaut) si le backend n'expose pas le brut. */
  requestedMinPriceHT: number;
  /** Prix brut saisi par l'opérateur. Présent pour le SUPERADMIN hub. */
  requestedMinPriceBaseHT?: number | null;
  depExtraDiscountPercent?: number | null;
  depWarehouse?: string | null;
}

/**
 * Prix à afficher et à rééditer côté opérateur : le brut stocké, jamais la
 * remise DEP (celle-ci n'existe qu'à l'exposition PARTNER).
 */
export function operatorRequestedPriceHT(opp: {
  requestedMinPriceHT: number;
  requestedMinPriceBaseHT?: number | null;
}): number {
  if (opp.requestedMinPriceBaseHT != null && Number.isFinite(opp.requestedMinPriceBaseHT)) {
    return opp.requestedMinPriceBaseHT;
  }
  return opp.requestedMinPriceHT;
}
