import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { supportChatApi } from '@/api/supportChat';
import { errorMessage } from '@/features/preparation/components/ListState';
import {
  SUPPORT_CHAT_STAFF_AUTHOR_NAME,
  type ListSupportConversationsResult,
  type SupportConversation,
  type SupportMessage,
} from '@/types/supportChat';

import {
  CLIENT_LIST_KEY,
  CLIENT_UNREAD_KEY,
  POLLING,
  clientDetailKey,
  clientMessagesKey,
} from '../queryKeys';
import { usePollingInterval } from '../shared/usePolling';
import { clearDraftAfterSend } from './draftStore';
import { hapticError, hapticSuccess } from './feedback';

/** Détail de la conversation (statut, sujet, lecture) : rafraîchi toutes les 15 s, comme le web. */
const DETAIL_POLL_MS = 15_000;

export function useClientConversation(id: string) {
  const interval = usePollingInterval(DETAIL_POLL_MS);
  return useQuery({
    queryKey: clientDetailKey(id),
    queryFn: ({ signal }) => supportChatApi.get(id, signal),
    refetchInterval: interval,
  });
}

/** Ajoute les messages reçus à ceux du cache, sans doublon (par `id`), dans l'ordre chronologique. */
export function mergeMessages(
  previous: readonly SupportMessage[],
  fresh: readonly SupportMessage[],
): SupportMessage[] {
  const known = new Set(previous.map((m) => m.id));
  const added = fresh.filter((m) => !known.has(m.id));
  if (added.length === 0) return previous as SupportMessage[];
  return [...previous, ...added].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/**
 * Messages du fil, rafraîchis toutes les 4 s. Le premier chargement est complet ; les suivants
 * sont incrémentaux (`after` = date du dernier message connu) et fusionnés dans le cache.
 */
export function useClientMessages(id: string) {
  const queryClient = useQueryClient();
  const interval = usePollingInterval(POLLING.clientMessages);
  // Un chargement complet à chaque ouverture du fil : l'expiration des pièces jointes évolue.
  const fullLoadDone = useRef(false);

  return useQuery({
    queryKey: clientMessagesKey(id),
    queryFn: async ({ signal }) => {
      const previous = queryClient.getQueryData<SupportMessage[]>(clientMessagesKey(id));
      const lastCreatedAt = previous?.[previous.length - 1]?.createdAt;
      if (!previous || !lastCreatedAt || !fullLoadDone.current) {
        const all = await supportChatApi.listMessages(id, undefined, signal);
        fullLoadDone.current = true;
        return all;
      }
      const fresh = await supportChatApi.listMessages(id, lastCreatedAt, signal);
      return mergeMessages(previous, fresh);
    },
    refetchInterval: interval,
  });
}

/** Met à jour la pastille « non lu » d'une conversation dans toutes les listes en cache. */
function patchListUnread(queryClient: QueryClient, id: string, unread: boolean) {
  queryClient.setQueriesData<ListSupportConversationsResult>({ queryKey: CLIENT_LIST_KEY }, (old) =>
    old ? { ...old, data: old.data.map((c) => (c.id === id ? { ...c, unread } : c)) } : old,
  );
}

/** La conversation figure-t-elle comme non lue dans une des listes en cache ? */
function isListedUnread(queryClient: QueryClient, id: string): boolean {
  return queryClient
    .getQueriesData<ListSupportConversationsResult>({ queryKey: CLIENT_LIST_KEY })
    .some(([, data]) => data?.data.some((c) => c.id === id && c.unread));
}

function invalidateLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: CLIENT_LIST_KEY });
  void queryClient.invalidateQueries({ queryKey: CLIENT_UNREAD_KEY });
}

/** Marque lu : optimiste sur la liste et le compteur du badge, puis invalide les deux. */
export function useMarkClientRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supportChatApi.markRead(id),
    onMutate: (id) => {
      if (isListedUnread(queryClient, id)) {
        queryClient.setQueryData<number>(CLIENT_UNREAD_KEY, (count) =>
          typeof count === 'number' ? Math.max(0, count - 1) : count,
        );
      }
      patchListUnread(queryClient, id, false);
    },
    onSettled: (_data, _error, id) => {
      invalidateLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: clientDetailKey(id) });
    },
  });
}

/** Marque non lu : optimiste sur la liste et le compteur du badge, puis invalide les deux. */
export function useMarkClientUnread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supportChatApi.markUnread(id),
    onMutate: (id) => {
      if (!isListedUnread(queryClient, id)) {
        queryClient.setQueryData<number>(CLIENT_UNREAD_KEY, (count) =>
          typeof count === 'number' ? count + 1 : count,
        );
      }
      patchListUnread(queryClient, id, true);
    },
    onError: (error) => {
      hapticError();
      toast.error(errorMessage(error, 'Impossible de marquer comme non lu.'));
    },
    onSettled: (_data, _error, id) => {
      invalidateLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: clientDetailKey(id) });
    },
  });
}

/**
 * Marque le fil lu à l'ouverture et à chaque nouveau message client. Renvoie une fonction qui
 * suspend ce marquage (pour « Marquer non lu », sinon le fil serait aussitôt relu).
 */
export function useAutoMarkRead(id: string, messages: readonly SupportMessage[] | undefined) {
  const markRead = useMarkClientRead();
  const markedMessageId = useRef<string | null>(null);
  const suspended = useRef(false);
  const { mutate } = markRead;

  const last = messages?.[messages.length - 1];
  const lastId = last?.id;
  const lastFromCustomer = last?.sender === 'CUSTOMER';

  useEffect(() => {
    if (suspended.current || !lastId || !lastFromCustomer) return;
    if (markedMessageId.current === lastId) return;
    markedMessageId.current = lastId;
    mutate(id);
  }, [id, lastId, lastFromCustomer, mutate]);

  return useCallback(() => {
    suspended.current = true;
  }, []);
}

/** Ferme ou rouvre la conversation, et reflète aussitôt le nouveau statut dans le cache. */
export function useToggleClientStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: SupportConversation['status']) =>
      status === 'OPEN' ? supportChatApi.close(id) : supportChatApi.reopen(id),
    onSuccess: (_data, previousStatus) => {
      hapticSuccess();
      const open = previousStatus !== 'OPEN';
      queryClient.setQueryData<SupportConversation>(clientDetailKey(id), (old) =>
        old
          ? {
              ...old,
              status: open ? 'OPEN' : 'CLOSED',
              closedAt: open ? null : new Date().toISOString(),
            }
          : old,
      );
      toast.success(open ? 'Conversation rouverte.' : 'Conversation fermée.');
    },
    onError: (error) => {
      hapticError();
      toast.error(errorMessage(error, 'Action impossible.'));
    },
    onSettled: () => {
      invalidateLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: clientDetailKey(id) });
    },
  });
}

/**
 * Envoi d'un message au client. Succès : brouillon vidé, fil et listes rafraîchis. Erreur :
 * toast, et le brouillon est conservé. Le back rouvre une conversation fermée à l'envoi.
 */
export function useSendClientMessage(id: string, onSent?: (reopened: boolean) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, fileIds }: { content: string; fileIds: string[] }) =>
      supportChatApi.postMessage(id, content, fileIds, SUPPORT_CHAT_STAFF_AUTHOR_NAME),
    onSuccess: () => {
      const wasClosed =
        queryClient.getQueryData<SupportConversation>(clientDetailKey(id))?.status === 'CLOSED';
      // La saisie est verrouillée pendant l'envoi : le brouillon courant est bien celui envoyé.
      clearDraftAfterSend(id);
      hapticSuccess();
      if (wasClosed) {
        queryClient.setQueryData<SupportConversation>(clientDetailKey(id), (old) =>
          old ? { ...old, status: 'OPEN', closedAt: null } : old,
        );
        toast.success('Message envoyé : la conversation a été rouverte.');
      }
      void queryClient.invalidateQueries({ queryKey: clientMessagesKey(id) });
      void queryClient.invalidateQueries({ queryKey: clientDetailKey(id) });
      invalidateLists(queryClient);
      onSent?.(wasClosed);
    },
    onError: (error) => {
      hapticError();
      toast.error(errorMessage(error, 'Impossible d’envoyer le message.'));
    },
  });
}
