/**
 * Opportunités de négociation du module PARTNER (`buyer-app/negotiation-opportunities/*`), alignées
 * sur `lib/types/negotiation-opportunities.ts` du web, limitées aux champs affichés. Pour un compte
 * non SUPERADMIN, le back retire déjà les champs internes (viabilité, clients…).
 */

export type PartnerOpportunityStatus =
  | 'OPEN'
  | 'IN_NEGOTIATION'
  | 'WON'
  | 'REFUSED'
  | 'ABANDONED'
  | 'STANDBY'
  | 'PRE_LAUNCH'
  | 'AWAITING_LAUNCH'
  | 'LAUNCHED'
  | 'ARCHIVED'
  | 'CANCELLED';

/** `STANDARD` : lignes hors DEP (défaut) ; `DEP` : lignes en déstockage du compte. */
export type PartnerOpportunityScope = 'STANDARD' | 'DEP';

export interface PartnerOpportunity {
  uuid: string;
  status: PartnerOpportunityStatus;
  warehouse: string;
  /** Entrepôt DEP ; `null` = opportunité standard. */
  depWarehouse: string | null;
  brand: string | null;
  designation: string | null;
  ean: string | null;
  codeEbat: string | null;
  categoryTypes: string[];
  /** Prix d'équilibre HT demandé. */
  requestedMinPriceHT: number;
  /** PA HT actuel ; `null` tant qu'aucune référence eBat n'est rattachée. */
  currentFixPriceHT: number | null;
  proposedPriceHT: number | null;
  proposedAt: string | null;
  proposedByName: string | null;
  resolvedAt: string | null;
  obtainedPriceHT: number | null;
  obtainedQuantity: number | null;
  availabilityDate: string | null;
  resolutionNote: string | null;
  operatorComment: string | null;
  amazonBuyboxSeller: string | null;
  createdAt: string;
  /** « Traitée » : porté par l'opportunité, partagé par tout le service. */
  treatedAt: string | null;
  treatedByName: string | null;
  messagesCount: number;
  proposalsCount: number;
  lastMessage: {
    content: string;
    authorName: string;
    targetUserName: string | null;
    createdAt: string;
  } | null;
  isRead: boolean;
}

export interface PartnerOpportunityProposal {
  id: string;
  authorName: string;
  authorRole: string | null;
  proposedPriceHT: number;
  note: string | null;
  createdAt: string;
}

export interface PartnerOpportunityDetail extends PartnerOpportunity {
  proposals: PartnerOpportunityProposal[];
}

export interface PartnerOpportunitiesResponse {
  items: PartnerOpportunity[];
  total: number;
}

export interface PartnerOpportunityMessage {
  id: string;
  authorUserId: string | null;
  authorName: string;
  authorRole: string | null;
  targetUserName: string | null;
  /** Évènement système (transition, changement de prix…) plutôt qu'un message. */
  isSystem: boolean;
  content: string;
  createdAt: string;
}

/** Statuts après la négociation : conversation et actions fermées aux RA / RAR (SUPERADMIN garde la main). */
export const POST_NEGOTIATION_STATUSES: readonly PartnerOpportunityStatus[] = [
  'PRE_LAUNCH',
  'LAUNCHED',
  'ABANDONED',
  'ARCHIVED',
];
