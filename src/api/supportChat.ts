import { apiClient, downloadAuthenticated, LONG_REQUEST_TIMEOUT_MS } from '@/api/client';
import { buildFileFormData, type PickedFile } from '@/lib/pickAttachment';
import {
  SUPPORT_CHAT_STAFF_AUTHOR_NAME,
  type AiRefinePayload,
  type AiRefineResult,
  type AiSuggestResult,
  type ExecuteActionPayload,
  type ExecuteActionResult,
  type ListSupportConversationsResult,
  type PrepareQuickReplyPayload,
  type PreparedQuickReply,
  type QuickReplyOptions,
  type SupportActionRecord,
  type SupportAttachment,
  type SupportConversation,
  type SupportConversationStatus,
  type SupportMessage,
} from '@/types/supportChat';

const base = (id: string) => `support-chat/staff/conversations/${encodeURIComponent(id)}`;

/**
 * Flux « Clients » des discussions (`SupportChatStaffController`, `support-chat/staff/*`),
 * portage de `front_externe_batipower/lib/api/support-chat.ts`. Réservé aux comptes HUB.
 */
export const supportChatApi = {
  /** Liste paginée des conversations, filtrable par statut et par recherche client. */
  list(
    params: { status?: SupportConversationStatus; search?: string; page?: number; limit?: number } = {},
    signal?: AbortSignal,
  ) {
    return apiClient.get<ListSupportConversationsResult>('support-chat/staff/conversations', {
      query: {
        status: params.status,
        search: params.search?.trim() || undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 50,
      },
      signal,
    });
  },

  /** Conversations ouvertes dont le dernier message client n'est pas lu (badge de l'onglet). */
  async unreadCount(signal?: AbortSignal) {
    const res = await apiClient.get<{ count?: number }>('support-chat/staff/unread-count', {
      signal,
    });
    return typeof res?.count === 'number' ? res.count : 0;
  },

  get(id: string, signal?: AbortSignal) {
    return apiClient.get<SupportConversation>(base(id), { signal });
  },

  /** Messages d'une conversation, éventuellement postérieurs à `after` (date ISO). */
  async listMessages(id: string, after?: string, signal?: AbortSignal) {
    const res = await apiClient.get<SupportMessage[]>(`${base(id)}/messages`, {
      query: { after },
      signal,
    });
    return Array.isArray(res) ? res : [];
  },

  postMessage(
    id: string,
    content: string,
    fileIds: string[] = [],
    authorName: string = SUPPORT_CHAT_STAFF_AUTHOR_NAME,
  ) {
    return apiClient.post<SupportMessage>(`${base(id)}/messages`, {
      content,
      authorName,
      ...(fileIds.length > 0 ? { fileIds } : {}),
    });
  },

  markRead(id: string) {
    return apiClient.post<void>(`${base(id)}/read`, {});
  },

  markUnread(id: string) {
    return apiClient.post<void>(`${base(id)}/unread`, {});
  },

  close(id: string) {
    return apiClient.post<SupportConversation>(`${base(id)}/close`, {});
  },

  reopen(id: string) {
    return apiClient.post<SupportConversation>(`${base(id)}/reopen`, {});
  },

  /**
   * Réponse IA de niveau SAV et actions proposées. Rien n'est envoyé ni exécuté ; la génération
   * est lente côté back, d'où le délai étendu.
   */
  aiSuggest(id: string, orderReference?: string) {
    return apiClient.post<AiSuggestResult>(
      `${base(id)}/ai-suggest`,
      { ...(orderReference ? { orderReference } : {}) },
      { timeoutMs: LONG_REQUEST_TIMEOUT_MS },
    );
  },

  /** Affine le brouillon selon une consigne, avec le même contexte que `aiSuggest`. */
  aiRefine(id: string, { draft, instructions, orderReference }: AiRefinePayload) {
    return apiClient.post<AiRefineResult>(
      `${base(id)}/ai-refine`,
      { draft, instructions, ...(orderReference ? { orderReference } : {}) },
      { timeoutMs: LONG_REQUEST_TIMEOUT_MS },
    );
  },

  async listActions(id: string, signal?: AbortSignal) {
    const res = await apiClient.get<SupportActionRecord[]>(`${base(id)}/actions`, { signal });
    return Array.isArray(res) ? res : [];
  },

  executeAction(id: string, payload: ExecuteActionPayload) {
    return apiClient.post<ExecuteActionResult>(`${base(id)}/actions`, payload, {
      timeoutMs: LONG_REQUEST_TIMEOUT_MS,
    });
  },

  /** Commandes et devis en cours du client, pour choisir une réponse rapide. */
  getQuickReplies(id: string, signal?: AbortSignal) {
    return apiClient.get<QuickReplyOptions>(`${base(id)}/quick-replies`, { signal });
  },

  /** Prépare le message modèle (et le PDF éventuel) d'une réponse rapide ; rien n'est envoyé. */
  prepareQuickReply(id: string, payload: PrepareQuickReplyPayload) {
    return apiClient.post<PreparedQuickReply>(`${base(id)}/quick-replies/prepare`, payload, {
      timeoutMs: LONG_REQUEST_TIMEOUT_MS,
    });
  },

  /** Téléverse une pièce jointe (PDF ou image, 10 Mo, conservée 30 jours) pour le prochain message. */
  uploadAttachment(id: string, file: PickedFile) {
    return apiClient.upload<SupportAttachment>(`${base(id)}/attachments`, buildFileFormData(file));
  },

  /** Télécharge la pièce jointe (Bearer) dans le cache de l'app et renvoie le fichier local. */
  downloadAttachment(conversationId: string, attachmentId: string, fileName: string) {
    return downloadAuthenticated(
      `${base(conversationId)}/attachments/${encodeURIComponent(attachmentId)}/download`,
      fileName,
    );
  },
};
