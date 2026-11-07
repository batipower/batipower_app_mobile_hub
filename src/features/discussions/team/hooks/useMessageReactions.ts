import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { messageReactionsApi } from '@/api/messageReactions';
import { useAuth } from '@/auth/AuthProvider';
import { errorMessage } from '@/features/preparation/components/ListState';
import type { ReactionSummaryDto } from '@/types/discussions';

import { teamReactionsKey } from '../../queryKeys';

type ReactionsByMessage = Record<string, ReactionSummaryDto[]>;

/** Nombre maximal d'identifiants par requête (l'URL transporte la liste en paramètre). */
const IDS_PER_REQUEST = 100;

const TARGET = 'GROUP_MESSAGE' as const;

/** Applique localement l'ajout ou le retrait de ma réaction (mise à jour optimiste). */
function applyToggle(
  reactions: ReactionSummaryDto[] | undefined,
  emoji: string,
  reactedByMe: boolean,
  myName: string,
): ReactionSummaryDto[] {
  const current = reactions ?? [];
  const existing = current.find((r) => r.emoji === emoji);

  if (reactedByMe) {
    if (!existing) return current;
    const count = existing.count - 1;
    if (count <= 0) return current.filter((r) => r.emoji !== emoji);
    return current.map((r) =>
      r.emoji === emoji
        ? { ...r, count, reactedByMe: false, userNames: r.userNames.filter((n) => n !== myName) }
        : r,
    );
  }

  if (!existing) {
    return [...current, { emoji, count: 1, reactedByMe: true, userNames: [myName] }];
  }
  return current.map((r) =>
    r.emoji === emoji
      ? { ...r, count: r.count + 1, reactedByMe: true, userNames: [...r.userNames, myName] }
      : r,
  );
}

/**
 * Réactions des messages d'un fil Équipe (`buyer-app/message-reactions`) : lecture groupée par
 * paquets de 100 identifiants, rafraîchie régulièrement, et bascule optimiste d'un emoji.
 */
export function useMessageReactions(
  conversationId: string,
  messageIds: readonly string[],
  refetchInterval: number | false,
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const myName = user?.name ?? 'Moi';
  const idsKey = messageIds.join(',');

  const query = useQuery({
    queryKey: [...teamReactionsKey(conversationId), idsKey],
    queryFn: async ({ signal }) => {
      const chunks: string[][] = [];
      for (let i = 0; i < messageIds.length; i += IDS_PER_REQUEST) {
        chunks.push(messageIds.slice(i, i + IDS_PER_REQUEST));
      }
      const parts = await Promise.all(
        chunks.map((ids) => messageReactionsApi.list(TARGET, ids, signal)),
      );
      return Object.assign({}, ...parts) as ReactionsByMessage;
    },
    enabled: messageIds.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval,
  });

  const toggle = useMutation({
    mutationFn: async (vars: { messageId: string; emoji: string; reactedByMe: boolean }) => {
      if (vars.reactedByMe) await messageReactionsApi.remove(TARGET, vars.messageId, vars.emoji);
      else await messageReactionsApi.add(TARGET, vars.messageId, vars.emoji);
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: teamReactionsKey(conversationId) });
      const snapshots = queryClient.getQueriesData<ReactionsByMessage>({
        queryKey: teamReactionsKey(conversationId),
      });
      queryClient.setQueriesData<ReactionsByMessage>(
        { queryKey: teamReactionsKey(conversationId) },
        (old) =>
          old
            ? {
                ...old,
                [vars.messageId]: applyToggle(
                  old[vars.messageId],
                  vars.emoji,
                  vars.reactedByMe,
                  myName,
                ),
              }
            : old,
      );
      return { snapshots };
    },
    onError: (error, _vars, context) => {
      for (const [key, data] of context?.snapshots ?? []) queryClient.setQueryData(key, data);
      toast.error(errorMessage(error, 'Impossible de modifier la réaction.'));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: teamReactionsKey(conversationId) });
    },
  });

  const reactions: ReactionsByMessage = query.data ?? {};

  /** Bascule `emoji` sur un message : le retire s'il est déjà de moi, l'ajoute sinon. */
  const toggleReaction = (messageId: string, emoji: string) => {
    const reactedByMe = reactions[messageId]?.find((r) => r.emoji === emoji)?.reactedByMe ?? false;
    toggle.mutate({ messageId, emoji, reactedByMe });
  };

  return { reactions, toggleReaction };
}
