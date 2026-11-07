import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { discussionsApi } from '@/api/discussions';
import type { GroupMessage } from '@/types/discussions';

import { POLLING, teamMessagesKey } from '../../queryKeys';
import { usePollingInterval } from '../../shared/usePolling';
import {
  mergeMessages,
  MESSAGES_LATEST_LIMIT,
  MESSAGES_PAGE_SIZE,
} from '../teamHelpers';

/**
 * Messages d'un fil Équipe, en ordre chronologique.
 *
 * - Les 100 messages les plus récents sont rafraîchis toutes les 5 s (l'écran doit avoir le
 *   focus : `usePollingInterval`).
 * - Les messages plus anciens se chargent à la demande (`loadOlder`, curseur `before` = id du
 *   plus ancien message connu) et restent en mémoire ; ils ne sont pas re-téléchargés à
 *   chaque rafraîchissement.
 */
export function useTeamMessages(conversationId: string) {
  const refetchInterval = usePollingInterval(POLLING.teamMessages);

  const latest = useQuery({
    queryKey: teamMessagesKey(conversationId),
    queryFn: ({ signal }) =>
      discussionsApi.listMessages(conversationId, { limit: MESSAGES_LATEST_LIMIT }, signal),
    refetchInterval,
  });

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [lastMerged, setLastMerged] = useState<GroupMessage[] | undefined>(undefined);
  const [exhausted, setExhausted] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Fusion ajustée pendant le rendu (et non dans un effet) : `latest.data` garde la même
  // référence tant que rien ne change, la fusion n'a donc lieu qu'à un vrai rafraîchissement.
  const latestData = latest.data;
  if (latestData && latestData !== lastMerged) {
    setLastMerged(latestData);
    setMessages((previous) => mergeMessages(previous, latestData));
  }

  const hasOlder = !exhausted && (latest.data?.length ?? 0) >= MESSAGES_LATEST_LIMIT;

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!oldest || !hasOlder || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await discussionsApi.listMessages(conversationId, {
        before: oldest.id,
        limit: MESSAGES_PAGE_SIZE,
      });
      setMessages((previous) => {
        const known = new Set(previous.map((m) => m.id));
        return [...page.filter((m) => !known.has(m.id)), ...previous];
      });
      if (page.length < MESSAGES_PAGE_SIZE) setExhausted(true);
    } catch {
      // Le prochain défilement vers le haut retentera ; le fil déjà chargé reste affiché.
    } finally {
      setLoadingOlder(false);
    }
  };

  return {
    messages,
    isLoading: latest.isPending,
    error: latest.error,
    refetch: latest.refetch,
    hasOlder,
    loadingOlder,
    loadOlder,
  };
}
