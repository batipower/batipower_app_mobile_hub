import { apiClient, downloadAuthenticated } from '@/api/client';
import { buildFileFormData, type PickedFile } from '@/lib/pickAttachment';
import type {
  CategoryTypeEnum,
  CreateConversationPayload,
  DiscussionBrandSearchResult,
  DiscussionEligibleUser,
  DiscussionOpportunitySearchResult,
  DiscussionProductSearchResult,
  DiscussionRenegotiationSearchResult,
  GroupConversationDetail,
  GroupConversationPendingInvitation,
  GroupConversationSummary,
  GroupMessage,
  GroupMessageFileAttachment,
  OutgoingCardAttachment,
  UpdateConversationPayload,
} from '@/types/discussions';

export type ArchivedFilter = 'active' | 'archived' | 'all';

/**
 * Discussions d'équipe (`discussions/*`, `GroupDiscussionsController` côté back), portage de
 * `front_externe_batipower/lib/api/discussions.ts`. Routes ouvertes à tous les rôles actifs.
 */
export const discussionsApi = {
  // ─── Conversations ─────────────────────────────────────────────────────────

  list(opts: { archived?: ArchivedFilter; signal?: AbortSignal } = {}) {
    return apiClient.get<GroupConversationSummary[]>('discussions', {
      query: {
        archived:
          opts.archived === 'archived' ? 'only' : opts.archived === 'all' ? 'all' : undefined,
      },
      signal: opts.signal,
    });
  },

  get(id: string, signal?: AbortSignal) {
    return apiClient.get<GroupConversationDetail>(`discussions/${encodeURIComponent(id)}`, {
      signal,
    });
  },

  create(payload: CreateConversationPayload) {
    return apiClient.post<GroupConversationDetail>('discussions', payload);
  },

  /** Message direct 1-à-1 : renvoie le fil existant avec `userId` ou le crée. */
  openDirect(userId: string) {
    return apiClient.post<GroupConversationDetail>('discussions/direct', { userId });
  },

  update(id: string, payload: UpdateConversationPayload) {
    return apiClient.patch<GroupConversationDetail>(
      `discussions/${encodeURIComponent(id)}`,
      payload,
    );
  },

  /** Archive (clôture) une discussion ; réversible via `unarchive`. */
  archive(id: string) {
    return apiClient.post<GroupConversationDetail>(`discussions/${encodeURIComponent(id)}/archive`, {});
  },

  unarchive(id: string) {
    return apiClient.post<GroupConversationDetail>(
      `discussions/${encodeURIComponent(id)}/unarchive`,
      {},
    );
  },

  // ─── Membres ───────────────────────────────────────────────────────────────

  inviteMembers(id: string, userIds: string[]) {
    return apiClient.post<{ invited: number; alreadyMember: number; alreadyInvited: number }>(
      `discussions/${encodeURIComponent(id)}/members`,
      { userIds },
    );
  },

  removeMember(id: string, userId: string) {
    return apiClient.delete<{ ok: true }>(
      `discussions/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
    );
  },

  // ─── Messages ──────────────────────────────────────────────────────────────

  listMessages(
    id: string,
    opts: { before?: string; limit?: number } = {},
    signal?: AbortSignal,
  ) {
    return apiClient.get<GroupMessage[]>(`discussions/${encodeURIComponent(id)}/messages`, {
      query: { before: opts.before, limit: opts.limit },
      signal,
    });
  },

  /**
   * Poste un message. `attachments` : cartes opportunité ou renégociation (10 au plus, le back
   * en fige un instantané) ; `fileAttachmentIds` : fichiers déjà téléversés (3 au plus).
   */
  postMessage(
    id: string,
    content: string,
    attachments?: OutgoingCardAttachment[] | null,
    fileAttachmentIds?: string[],
  ) {
    return apiClient.post<GroupMessage>(`discussions/${encodeURIComponent(id)}/messages`, {
      content,
      attachments: attachments ?? [],
      fileAttachmentIds: fileAttachmentIds ?? [],
    });
  },

  deleteMessage(id: string, messageId: string) {
    return apiClient.delete<{ ok: true }>(
      `discussions/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}`,
    );
  },

  markAsRead(id: string) {
    return apiClient.post<{ ok: true; lastReadAt: string }>(
      `discussions/${encodeURIComponent(id)}/read`,
      {},
    );
  },

  markAsUnread(id: string) {
    return apiClient.post<{ ok: true; lastReadAt: string | null }>(
      `discussions/${encodeURIComponent(id)}/unread`,
      {},
    );
  },

  // ─── Invitations ───────────────────────────────────────────────────────────

  listInvitations(signal?: AbortSignal) {
    return apiClient.get<GroupConversationPendingInvitation[]>('discussions/invitations', {
      signal,
    });
  },

  acceptInvitation(id: string) {
    return apiClient.post<{ ok: true; conversationId: string }>(
      `discussions/invitations/${encodeURIComponent(id)}/accept`,
      {},
    );
  },

  declineInvitation(id: string) {
    return apiClient.post<{ ok: true }>(
      `discussions/invitations/${encodeURIComponent(id)}/decline`,
      {},
    );
  },

  // ─── Recherches (sélecteurs) ───────────────────────────────────────────────

  searchEligibleUsers(search?: string, signal?: AbortSignal) {
    return apiClient.get<DiscussionEligibleUser[]>('discussions/eligible-users', {
      query: { search },
      signal,
    });
  },

  searchProducts(
    opts: { search?: string; categoryType?: CategoryTypeEnum; limit?: number } = {},
    signal?: AbortSignal,
  ) {
    return apiClient.get<DiscussionProductSearchResult[]>('discussions/products', {
      query: { search: opts.search, categoryType: opts.categoryType, limit: opts.limit },
      signal,
    });
  },

  searchBrands(opts: { search?: string; limit?: number } = {}, signal?: AbortSignal) {
    return apiClient.get<DiscussionBrandSearchResult[]>('discussions/brands', {
      query: { search: opts.search, limit: opts.limit },
      signal,
    });
  },

  /** Sélecteur d'opportunités (SUPERADMIN : 403 pour les autres rôles). */
  searchOpportunities(opts: { search?: string; limit?: number } = {}, signal?: AbortSignal) {
    return apiClient.get<DiscussionOpportunitySearchResult[]>('discussions/opportunities/search', {
      query: { q: opts.search, limit: opts.limit },
      signal,
    });
  },

  /** Sélecteur de produits en renégociation (hors archivés). */
  searchRenegotiations(opts: { search?: string; limit?: number } = {}, signal?: AbortSignal) {
    return apiClient.get<DiscussionRenegotiationSearchResult[]>(
      'discussions/renegotiations/search',
      { query: { q: opts.search, limit: opts.limit }, signal },
    );
  },

  // ─── Fichiers (pièces jointes) ─────────────────────────────────────────────

  uploadFile(conversationId: string, file: PickedFile, permanent = false) {
    return apiClient.upload<GroupMessageFileAttachment>(
      `discussions/${encodeURIComponent(conversationId)}/files`,
      buildFileFormData(file, permanent ? { permanent: 'true' } : undefined),
    );
  },

  /** Télécharge la pièce jointe (Bearer) dans le cache de l'app et renvoie le fichier local. */
  downloadFile(conversationId: string, fileId: string, fileName: string) {
    return downloadAuthenticated(
      `discussions/${encodeURIComponent(conversationId)}/files/${encodeURIComponent(fileId)}/download`,
      fileName,
    );
  },

  toggleFilePermanent(conversationId: string, fileId: string, permanent: boolean) {
    return apiClient.patch<GroupMessageFileAttachment>(
      `discussions/${encodeURIComponent(conversationId)}/files/${encodeURIComponent(fileId)}`,
      { permanent },
    );
  },
};
