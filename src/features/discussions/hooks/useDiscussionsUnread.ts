import { useQuery } from '@tanstack/react-query';

import { discussionsApi } from '@/api/discussions';
import { supportChatApi } from '@/api/supportChat';

import { CLIENT_UNREAD_KEY, POLLING, teamListKey } from '../queryKeys';

/**
 * Non-lus de la messagerie, pour le badge de l'onglet : conversations Équipe avec des messages
 * non lus (somme des `unreadCount` des discussions actives) + conversations Clients ouvertes
 * dont le dernier message client n'est pas lu. Les requêtes partagent le cache de l'écran
 * Discussions : aucune requête en plus quand il est ouvert.
 */
export function useDiscussionsUnread(enabled = true) {
  const team = useQuery({
    queryKey: teamListKey('active'),
    queryFn: ({ signal }) => discussionsApi.list({ archived: 'active', signal }),
    refetchInterval: POLLING.teamList,
    enabled,
  });
  const clients = useQuery({
    queryKey: CLIENT_UNREAD_KEY,
    queryFn: ({ signal }) => supportChatApi.unreadCount(signal),
    refetchInterval: POLLING.clientUnread,
    staleTime: 0,
    enabled,
  });

  const teamUnread = (team.data ?? []).reduce((total, c) => total + c.unreadCount, 0);
  const clientsUnread = clients.data ?? 0;
  return { teamUnread, clientsUnread, total: teamUnread + clientsUnread };
}
