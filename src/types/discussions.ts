import type { AppUserRole, BatipowerModule } from '@/types/user';

/**
 * Types des discussions d'équipe (`discussions/*`), repris de `GroupConversation*` et
 * `GroupMessage*` de `front_externe_batipower/lib/types.ts`.
 */

export type Warehouse = 'FLEVY' | 'DOMBASLE' | 'QG_BATIPOWER' | 'NANCY' | 'NICODEME' | 'FBA_AMAZON';

export type CategoryTypeEnum =
  | 'ELECTRICITE'
  | 'VENTILATION'
  | 'PLOMBERIE'
  | 'CHAUFFAGE'
  | 'SANITAIRE'
  | 'OUTILLAGE'
  | 'CARRELAGE'
  | 'PHOTO';

export const CATEGORY_TYPE_VALUES: readonly CategoryTypeEnum[] = [
  'ELECTRICITE',
  'VENTILATION',
  'PLOMBERIE',
  'CHAUFFAGE',
  'SANITAIRE',
  'OUTILLAGE',
  'CARRELAGE',
  'PHOTO',
];

export type GroupDiscussionScope = 'CATEGORY' | 'PRODUCT_SET' | 'BRAND' | 'FREE' | 'DIRECT';

export type GroupConversationMemberRole = 'OWNER' | 'MEMBER';

export type GroupConversationMemberStatus = 'ACTIVE' | 'LEFT';

export type GroupConversationInvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface GroupConversationLastMessage {
  id: string;
  content: string;
  authorName: string;
  authorUserCode: string | null;
  createdAt: string;
}

export interface GroupConversationParticipant {
  userId: string;
  name: string;
  code: string | null;
  role: AppUserRole;
  /** Modules Batipower (PARTNER/HUB) portés par ce membre. */
  modules: BatipowerModule[];
  email: string;
  memberRole: GroupConversationMemberRole;
  status: GroupConversationMemberStatus;
  joinedAt: string;
  lastReadAt: string | null;
}

export interface GroupConversationProduct {
  reference: string;
  designation: string | null;
  brand: string | null;
  categoryType: CategoryTypeEnum | null;
  addedAt: string;
}

export interface GroupConversationSummary {
  id: string;
  title: string;
  scope: GroupDiscussionScope;
  categoryType: CategoryTypeEnum | null;
  /** Renseigné uniquement quand `scope = BRAND`. */
  brand: string | null;
  productCount: number;
  memberCount: number;
  unreadCount: number;
  lastMessage: GroupConversationLastMessage | null;
  lastMessageAt: string | null;
  /** Renseigné quand la conversation est archivée (lecture seule, restaurable). */
  archivedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  myRole: GroupConversationMemberRole;
}

export interface GroupConversationPendingInvitation {
  id: string;
  conversationId: string;
  conversationTitle: string;
  scope: GroupDiscussionScope;
  categoryType: CategoryTypeEnum | null;
  brand: string | null;
  invitedUserId: string;
  invitedUserName: string;
  invitedByUserId: string;
  invitedByName: string;
  invitedByUserCode: string | null;
  status: GroupConversationInvitationStatus;
  createdAt: string;
}

export interface GroupConversationDetail extends GroupConversationSummary {
  members: GroupConversationParticipant[];
  products: GroupConversationProduct[];
  pendingInvitations: GroupConversationPendingInvitation[];
}

export type OpportunityStatus =
  | 'OPEN'
  | 'IN_NEGOTIATION'
  | 'WON'
  | 'REFUSED'
  | 'ABANDONED'
  | 'STANDBY'
  | 'LAUNCHED'
  | 'ARCHIVED';

export type RenegotiationStatus =
  | 'DRAFT_PRICE_PENDING'
  | 'OPEN'
  | 'STANDBY'
  | 'WON'
  | 'REFUSED'
  | 'ABANDONED'
  | 'ARCHIVED';

/**
 * Snapshot d'opportunité joint à un message (données figées au moment de l'envoi).
 * Seul le SUPERADMIN peut en envoyer.
 */
export interface OpportunityMessageAttachment {
  type: 'OPPORTUNITY';
  opportunityUuid: string;
  /** Code Ebatpro. */
  reference: string | null;
  ean: string | null;
  brand: string | null;
  designation: string | null;
  status: OpportunityStatus;
  requestedMinPriceHT: number;
  proposedPriceHT: number | null;
  warehouse: Warehouse;
  /** `true` pour une opportunité DEP. Absent = standard. */
  isDep?: boolean;
  depWarehouse?: string | null;
  /** Miniature JPEG base64 du produit. */
  thumbnailBase64?: string | null;
  capturedAt: string;
}

/** Snapshot d'un produit en renégociation joint à un message (SUPERADMIN). */
export interface RenegotiationMessageAttachment {
  type: 'RENEGOTIATION';
  renegotiationUuid: string;
  reference: string;
  ean: string | null;
  brand: string | null;
  designation: string | null;
  status: RenegotiationStatus;
  currentFixPriceHT: number | null;
  requestedMinPriceHT: number | null;
  proposedPriceHT: number | null;
  warehouse: Warehouse;
  thumbnailBase64?: string | null;
  capturedAt: string;
}

export type GroupMessageAttachment = OpportunityMessageAttachment | RenegotiationMessageAttachment;

/** Nombre maximal de cartes (opportunité ou renégociation) par message, aligné sur le back. */
export const MAX_MESSAGE_ATTACHMENTS = 10;

export interface GroupMessageFileAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  permanent: boolean;
  expiresAt: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export interface GroupMessage {
  id: string;
  conversationId: string;
  authorUserId: string;
  authorUserCode: string | null;
  authorName: string;
  authorRole: AppUserRole;
  /** Modules de l'auteur ; absent = tableau vide. */
  authorModules?: BatipowerModule[];
  content: string;
  /** Cartes attachées, dans l'ordre ; absent = aucune. */
  attachments?: GroupMessageAttachment[];
  /** @deprecated Ancien format à une seule carte, conservé pour la lecture des vieux messages. */
  attachment?: GroupMessageAttachment | null;
  fileAttachments?: GroupMessageFileAttachment[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface DiscussionEligibleUser {
  id: string;
  name: string;
  code: string | null;
  role: AppUserRole;
  modules: BatipowerModule[];
  email: string;
}

export interface DiscussionProductSearchResult {
  reference: string;
  designation: string | null;
  brand: string | null;
  categoryType: CategoryTypeEnum | null;
}

export interface DiscussionBrandSearchResult {
  /** Nom normalisé (MAJUSCULES + trim). */
  name: string;
  productCount: number;
}

export interface DiscussionOpportunitySearchResult {
  uuid: string;
  reference: string | null;
  ean: string | null;
  brand: string | null;
  designation: string | null;
  status: OpportunityStatus;
  requestedMinPriceHT: number;
  proposedPriceHT: number | null;
  warehouse: Warehouse;
  isDep?: boolean;
  depWarehouse?: string | null;
  thumbnailBase64?: string | null;
  createdAt: string;
}

export interface DiscussionRenegotiationSearchResult {
  uuid: string;
  reference: string;
  ean: string | null;
  brand: string | null;
  designation: string | null;
  status: RenegotiationStatus;
  currentFixPriceHT: number | null;
  requestedMinPriceHT: number | null;
  proposedPriceHT: number | null;
  warehouse: Warehouse;
  thumbnailBase64?: string | null;
  createdAt: string;
}

/** Carte à joindre à un message, telle que l'attend `POST discussions/:id/messages`. */
export type OutgoingCardAttachment =
  | { type: 'OPPORTUNITY'; opportunityUuid: string }
  | { type: 'RENEGOTIATION'; renegotiationUuid: string };

export interface CreateConversationPayload {
  title: string;
  scope: GroupDiscussionScope;
  categoryType?: CategoryTypeEnum | null;
  /** Obligatoire quand `scope === 'BRAND'` (normalisé côté back). */
  brand?: string | null;
  productReferences?: string[];
  invitedUserIds?: string[];
  initialAttachment?: { type: 'OPPORTUNITY' | 'RENEGOTIATION'; uuid: string } | null;
}

export interface UpdateConversationPayload {
  title?: string;
  addProductReferences?: string[];
  removeProductReferences?: string[];
}

// ─── Réactions ───────────────────────────────────────────────────────────────

export type MessageReactionTargetType =
  | 'GROUP_MESSAGE'
  | 'BUYER_PRODUCT_MESSAGE'
  | 'LOGISTICS_ORDER_MESSAGE'
  | 'NEGOTIATION_OPPORTUNITY_MESSAGE'
  | 'RENEGOTIATION_OPPORTUNITY_MESSAGE'
  | 'DELIVERY_NOTE_MESSAGE'
  | 'PURCHASE_PRICE_PROPOSAL_MESSAGE'
  | 'BRAND_NEGOTIATION_MESSAGE';

export interface ReactionSummaryDto {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  userNames: string[];
}
