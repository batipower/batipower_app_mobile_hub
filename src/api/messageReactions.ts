import { apiClient } from '@/api/client';
import type { MessageReactionTargetType, ReactionSummaryDto } from '@/types/discussions';

/** Emojis proposés, identiques à ceux du web (`lib/constants/reactions.ts`). */
export const ESSENTIAL_REACTIONS = ['👍', '👎', '❤️', '😂', '🙏', '🎉'] as const;

/** Réactions aux messages (`buyer-app/message-reactions`), portage du client web. */
export const messageReactionsApi = {
  list(targetType: MessageReactionTargetType, messageIds: string[], signal?: AbortSignal) {
    return apiClient.get<Record<string, ReactionSummaryDto[]>>('buyer-app/message-reactions', {
      query: { targetType, messageIds: messageIds.join(',') },
      signal,
    });
  },

  add(targetType: MessageReactionTargetType, messageId: string, emoji: string) {
    return apiClient.post<{ ok: true }>('buyer-app/message-reactions', {
      targetType,
      messageId,
      emoji,
    });
  },

  remove(targetType: MessageReactionTargetType, messageId: string, emoji: string) {
    return apiClient.delete<{ ok: true }>('buyer-app/message-reactions', {
      query: { targetType, messageId, emoji },
    });
  },
};
