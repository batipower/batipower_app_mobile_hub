/**
 * Types du flux « Clients » des discussions (`support-chat/staff/*`), repris de
 * `front_externe_batipower/lib/api/support-chat.ts`.
 */

export type SupportConversationStatus = 'OPEN' | 'CLOSED';
export type SupportMessageSender = 'CUSTOMER' | 'STAFF';
export type SupportConversationSubjectType = 'GENERAL' | 'ORDER' | 'QUOTE' | 'PRODUCT';

export interface SupportConversationLastMessagePreview {
  content: string;
  sender: SupportMessageSender;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  prestashopCustomerId: number;
  customerEmail: string;
  customerName: string;
  status: SupportConversationStatus;
  subjectType: SupportConversationSubjectType;
  subjectId: string | null;
  subjectLabel: string | null;
  /** Réf. HUB ouvrable en drawer (`Order.reference` ou `ApproRows.reference`). Absent si QUOTE/GENERAL ou non relié. */
  subjectReference?: string | null;
  lastMessageAt: string;
  /** Présent sur `GET /conversations/:id` (détail), absent de la liste. */
  staffLastReadAt?: string | null;
  createdAt: string;
  closedAt: string | null;
  /** Présent sur `GET /conversations` (aperçu liste). */
  lastMessage?: SupportConversationLastMessagePreview | null;
  /** Présent sur `GET /conversations` (pastille non-lu par conversation). */
  unread?: boolean;
}

export interface SupportAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: 'STAFF' | 'CUSTOMER' | string;
  expiresAt: string;
  /** Fichier supprimé ou conservation de 30 jours dépassée : plus téléchargeable. */
  expired: boolean;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  sender: SupportMessageSender;
  authorName: string | null;
  content: string;
  createdAt: string;
  attachments?: SupportAttachment[];
}

export type SupportActionType = 'REFUND' | 'RETURN_LABEL' | 'NON_RECEIPT_ATTESTATION' | 'RESEND';
export type RefundMode = 'total' | 'products' | 'custom';

export interface SupportActionParams {
  mode?: RefundMode;
  products?: { reference: string; quantity: number }[];
  /** Montant TTC en euros (mode `custom`). */
  amount?: number;
  nbColis?: number;
}

export interface ProposedAction {
  type: SupportActionType;
  label: string;
  orderReference: string;
  params: SupportActionParams;
  rationale: string;
  warning?: string;
  /** Faux pour RESEND (traité à la main depuis la commande). */
  executable: boolean;
}

export interface AiSuggestOrderSummary {
  reference: string;
  status: string | null;
  paymentStatus: string | null;
  totalPaid: number | null;
  refunded: boolean;
  shippedOrDelivered: boolean;
}

export interface CustomerOrderOption {
  reference: string;
  dateAdd: string | null;
  totalPaid: number | null;
}

export interface AiSuggestResult {
  suggestion: string;
  scenario: string | null;
  actions: ProposedAction[];
  missingInfo: string[];
  order: AiSuggestOrderSummary | null;
  orders: CustomerOrderOption[];
  provider?: string;
  model?: string;
}

export interface AiRefinePayload {
  /** Brouillon courant, éventuellement retouché à la main. */
  draft: string;
  instructions: string;
  orderReference?: string;
}

/** Seul le texte change : l'analyse et les actions proposées restent celles de la Réponse IA. */
export interface AiRefineResult {
  suggestion: string;
  provider?: string;
  model?: string;
}

export interface SupportActionRecord {
  id: string;
  type: SupportActionType | string;
  label: string;
  orderReference: string;
  params: unknown;
  status: 'PENDING' | 'DONE' | 'FAILED' | string;
  result: unknown;
  errorMessage: string | null;
  performedBy: string | null;
  createdAt: string;
}

export interface ExecuteActionPayload {
  type: Exclude<SupportActionType, 'RESEND'>;
  orderReference: string;
  params?: SupportActionParams;
  /** RETURN_LABEL: créer un nouveau lot même si un lot actif existe. */
  forceNew?: boolean;
}

export interface ExecuteActionResult {
  action: SupportActionRecord;
  message: string;
  /** NON_RECEIPT_ATTESTATION: fichier à joindre au prochain message. */
  attachment?: SupportAttachment;
}

export type QuickReplyType = 'INVOICE' | 'QUOTE' | 'TRACKING';

export interface QuickReplyQuoteOption {
  id: string;
  quoteNumber: string;
  status: string;
  totalTTC: number;
  validUntil: string | null;
}

export interface QuickReplyOptions {
  orders: CustomerOrderOption[];
  /** Commande du sujet de la conversation, à proposer en premier. */
  defaultOrderReference: string | null;
  quotes: QuickReplyQuoteOption[];
}

export interface PrepareQuickReplyPayload {
  type: QuickReplyType;
  orderReference?: string;
  quoteId?: string;
}

export interface PreparedQuickReply {
  message: string;
  /** PDF généré (facture, devis), à joindre au prochain message. */
  attachment: SupportAttachment | null;
}

/** Limites des pièces jointes du chat support, alignées sur le back et le web. */
export const SUPPORT_CHAT_MAX_FILES_PER_MESSAGE = 3;
export const SUPPORT_CHAT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const SUPPORT_CHAT_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export interface ListSupportConversationsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListSupportConversationsResult {
  data: SupportConversation[];
  meta: ListSupportConversationsMeta;
}

/** Nom d'auteur affiche cote client pour toute reponse staff, quel que soit le compte connecte. */
export const SUPPORT_CHAT_STAFF_AUTHOR_NAME = 'Équipe Batipower';
