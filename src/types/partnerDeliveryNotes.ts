/**
 * BL à corriger du module PARTNER (`buyer-app/delivery-note-assignments/*`), alignés sur
 * `DeliveryNoteAssignment*` de `front_externe_batipower/lib/types.ts`, limités aux champs affichés.
 */

/** Ligne d'un BL : prix lu sur le document contre prix attendu en base. */
export interface PartnerDeliveryNoteLine {
  ebatRef: string;
  designation: string | null;
  brand: string | null;
  categoryType: string | null;
  quantity: number;
  priceRead: number | null;
  priceExpected: number | null;
  lineTotalRead: number | null;
  lineTotalExpected: number | null;
  absoluteDiff: number | null;
  percentDiff: number | null;
  isError: boolean;
  thumbnailBase64: string | null;
}

/** Ligne en écart, avec le BL parent (vue « lignes en erreur », cœur de la page). */
export interface PartnerDeliveryNoteErrorLine extends PartnerDeliveryNoteLine {
  deliveryNoteUuid: string;
  deliveryNoteReference: string | null;
  numOrderEbat: string | null;
  numOrderWarehouse: string | null;
  deliveryNoteCreatedAt: string;
  warehouse: string;
  /** Statut « traité » du BL parent, partagé par tout le service. */
  treatedAt: string | null;
  treatedByName: string | null;
  forcedResolvedAt: string | null;
  messagesCount: number;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  lastMessageAuthorName: string | null;
}

export interface PartnerDeliveryNote {
  uuid: string;
  deliveryNoteReference: string | null;
  numOrderEbat: string | null;
  numOrderWarehouse: string | null;
  warehouse: string;
  brands: string[];
  categoryTypes: string[];
  totalNetAPayer: number | null;
  totalHTEstime: number | null;
  absoluteDiff: number | null;
  percentDiff: number | null;
  isError: boolean;
  isSolved: boolean;
  forcedResolvedAt: string | null;
  treatedAt: string | null;
  treatedByName: string | null;
  createdAt: string;
  linesInErrorCount: number;
  messagesCount: number;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  lastMessageAuthorName: string | null;
}

export interface PartnerDeliveryNoteDetail extends PartnerDeliveryNote {
  lines: PartnerDeliveryNoteLine[];
}

export interface PartnerDeliveryNoteLinesResponse {
  items: PartnerDeliveryNoteErrorLine[];
  total: number;
}

export interface PartnerDeliveryNoteMessage {
  id: string;
  authorUserId: string;
  authorName: string;
  authorRole: string | null;
  content: string;
  createdAt: string;
}
