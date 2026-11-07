import type { BadgeTone } from '@/components/ui';
import type {
  DiscussionOpportunitySearchResult,
  DiscussionRenegotiationSearchResult,
  GroupConversationParticipant,
  GroupMessage,
  GroupMessageAttachment,
  GroupMessageFileAttachment,
  OpportunityMessageAttachment,
  OpportunityStatus,
  OutgoingCardAttachment,
  RenegotiationMessageAttachment,
  RenegotiationStatus,
} from '@/types/discussions';
import type { BatipowerModule } from '@/types/user';

/** Longueur maximale d'un message, alignée sur le back (`MAX_MESSAGE_LENGTH`). */
export const TEAM_MESSAGE_MAX_LENGTH = 4000;

/** Messages les plus récents interrogés à chaque rafraîchissement (maximum accepté par le back : 100). */
export const MESSAGES_LATEST_LIMIT = 100;

/** Taille d'une page d'anciens messages. */
export const MESSAGES_PAGE_SIZE = 50;

/** Fenêtre de regroupement des messages consécutifs d'un même auteur (comme le web : 5 min). */
export const GROUPING_WINDOW_MS = 5 * 60 * 1000;

/** Mise en forme d'un statut : libellé en français et teinte de pastille. */
export interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

/** Statuts d'une opportunité, libellés du web (`OpportunityCard.tsx`). */
export const OPPORTUNITY_STATUS: Record<OpportunityStatus, StatusMeta> = {
  OPEN: { label: 'Ouverte', tone: 'green' },
  IN_NEGOTIATION: { label: 'En négociation', tone: 'amber' },
  STANDBY: { label: 'Standby', tone: 'purple' },
  WON: { label: 'Acceptée', tone: 'green' },
  REFUSED: { label: 'Refusée', tone: 'red' },
  ABANDONED: { label: 'Abandonnée', tone: 'amber' },
  LAUNCHED: { label: 'Lancée', tone: 'blue' },
  ARCHIVED: { label: 'Archivée', tone: 'neutral' },
};

/** Statuts d'une renégociation, libellés du web (`RenegotiationCard.tsx`). */
export const RENEGOTIATION_STATUS: Record<RenegotiationStatus, StatusMeta> = {
  DRAFT_PRICE_PENDING: { label: 'Brouillon', tone: 'neutral' },
  OPEN: { label: 'Ouverte', tone: 'green' },
  STANDBY: { label: 'Standby', tone: 'purple' },
  WON: { label: 'Acceptée', tone: 'green' },
  REFUSED: { label: 'Refusée', tone: 'red' },
  ABANDONED: { label: 'Abandonnée', tone: 'amber' },
  ARCHIVED: { label: 'Archivée', tone: 'neutral' },
};

/** Source d'image d'une miniature base64 (avec ou sans préfixe `data:`). */
export function thumbnailSource(base64: string | null | undefined): string | null {
  if (!base64) return null;
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
}

/** Modules d'un compte : une liste vide désigne le parc historique PARTNER (comme le web). */
export function effectiveModules(modules: BatipowerModule[] | null | undefined): BatipowerModule[] {
  return modules && modules.length > 0 ? modules : ['PARTNER'];
}

/** Cartes d'un message, dans l'ordre ; retombe sur l'ancien champ `attachment` (singulier). */
export function messageCards(message: GroupMessage): GroupMessageAttachment[] {
  if (message.attachments && message.attachments.length > 0) return message.attachments;
  return message.attachment ? [message.attachment] : [];
}

/** Clé stable d'une carte (opportunité ou renégociation). */
export function cardKey(card: GroupMessageAttachment): string {
  return card.type === 'OPPORTUNITY'
    ? `OPP:${card.opportunityUuid}`
    : `REN:${card.renegotiationUuid}`;
}

/** Carte au format attendu par `POST discussions/:id/messages`. */
export function toOutgoingCard(card: GroupMessageAttachment): OutgoingCardAttachment {
  return card.type === 'OPPORTUNITY'
    ? { type: 'OPPORTUNITY', opportunityUuid: card.opportunityUuid }
    : { type: 'RENEGOTIATION', renegotiationUuid: card.renegotiationUuid };
}

/** Aperçu de carte (composer) construit depuis un résultat de recherche d'opportunités. */
export function opportunityCardFromResult(
  result: DiscussionOpportunitySearchResult,
): OpportunityMessageAttachment {
  return {
    type: 'OPPORTUNITY',
    opportunityUuid: result.uuid,
    reference: result.reference,
    ean: result.ean,
    brand: result.brand,
    designation: result.designation,
    status: result.status,
    requestedMinPriceHT: result.requestedMinPriceHT,
    proposedPriceHT: result.proposedPriceHT,
    warehouse: result.warehouse,
    isDep: result.isDep,
    depWarehouse: result.depWarehouse,
    thumbnailBase64: result.thumbnailBase64 ?? null,
    capturedAt: new Date().toISOString(),
  };
}

/** Aperçu de carte (composer) construit depuis un résultat de recherche de renégociations. */
export function renegotiationCardFromResult(
  result: DiscussionRenegotiationSearchResult,
): RenegotiationMessageAttachment {
  return {
    type: 'RENEGOTIATION',
    renegotiationUuid: result.uuid,
    reference: result.reference,
    ean: result.ean,
    brand: result.brand,
    designation: result.designation,
    status: result.status,
    currentFixPriceHT: result.currentFixPriceHT,
    requestedMinPriceHT: result.requestedMinPriceHT,
    proposedPriceHT: result.proposedPriceHT,
    warehouse: result.warehouse,
    thumbnailBase64: result.thumbnailBase64 ?? null,
    capturedAt: new Date().toISOString(),
  };
}

/** État d'un fichier joint : téléchargeable, expiré (30 jours écoulés) ou supprimé. */
export type FileAvailability = 'available' | 'expired' | 'deleted';

export function fileAvailability(
  file: GroupMessageFileAttachment,
  now = Date.now(),
): FileAvailability {
  if (file.deletedAt) return 'deleted';
  if (!file.permanent && file.expiresAt) {
    const expiresAt = new Date(file.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt < now) return 'expired';
  }
  return 'available';
}

/**
 * Participants ayant lu un message (accusés de lecture) : `lastReadAt >= createdAt`, hors
 * auteur et utilisateur courant. Le mode discret des SUPERADMIN est déjà appliqué par l'API
 * (`lastReadAt` nul), qui compte alors comme « non lu ».
 */
export function messageReaders(
  message: GroupMessage,
  members: readonly GroupConversationParticipant[],
  currentUserId: string | null,
): GroupConversationParticipant[] {
  const createdAt = new Date(message.createdAt).getTime();
  return members.filter((member) => {
    if (member.status !== 'ACTIVE') return false;
    if (member.userId === message.authorUserId || member.userId === currentUserId) return false;
    if (!member.lastReadAt) return false;
    return new Date(member.lastReadAt).getTime() >= createdAt;
  });
}

/**
 * Fusionne les messages déjà chargés (plus anciens compris) avec la fenêtre la plus récente
 * renvoyée par l'API (ordre chronologique) :
 * - dans la fenêtre, l'API fait foi (un message supprimé en disparaît) ;
 * - avant la fenêtre, les anciens messages déjà chargés sont conservés.
 */
export function mergeMessages(
  previous: readonly GroupMessage[],
  latest: readonly GroupMessage[],
  windowLimit = MESSAGES_LATEST_LIMIT,
): GroupMessage[] {
  const first = latest[0];
  if (!first || latest.length < windowLimit) return [...latest];
  const boundary = new Date(first.createdAt).getTime();
  const latestIds = new Set(latest.map((m) => m.id));
  const older = previous.filter(
    (m) => new Date(m.createdAt).getTime() < boundary && !latestIds.has(m.id),
  );
  return [...older, ...latest];
}

/** Taille lisible d'un fichier joint (réexport pour garder les imports locaux courts). */
export { formatFileSize } from '@/lib/pickAttachment';
