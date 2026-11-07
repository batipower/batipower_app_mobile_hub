import type { ArchivedFilter } from '@/api/discussions';
import type { SupportConversationStatus } from '@/types/supportChat';

/**
 * Clés de cache des discussions. Les préfixes servent à invalider en groupe (une réponse
 * rafraîchit la liste et le fil) ; les clés complètes isolent chaque écran.
 */

/** Équipe. */
export const TEAM_ROOT_KEY = ['discussions', 'team'] as const;
export const TEAM_LIST_KEY = ['discussions', 'team', 'list'] as const;
export const teamListKey = (archived: ArchivedFilter) =>
  ['discussions', 'team', 'list', archived] as const;
export const teamDetailKey = (id: string) => ['discussions', 'team', 'detail', id] as const;
export const teamMessagesKey = (id: string) => ['discussions', 'team', 'messages', id] as const;
export const teamReactionsKey = (id: string) => ['discussions', 'team', 'reactions', id] as const;
export const TEAM_INVITATIONS_KEY = ['discussions', 'team', 'invitations'] as const;

/** Sélecteurs (recherche d'utilisateurs, produits, marques, opportunités, renégociations). */
export const teamPickerKey = (
  kind: 'users' | 'products' | 'brands' | 'opportunities' | 'renegotiations',
  term: string,
  extra?: string,
) => ['discussions', 'team', 'picker', kind, term, extra ?? null] as const;

/** Clients. */
export const CLIENT_ROOT_KEY = ['discussions', 'clients'] as const;
export const CLIENT_LIST_KEY = ['discussions', 'clients', 'list'] as const;
export const clientListKey = (status: SupportConversationStatus | 'ALL', search: string) =>
  ['discussions', 'clients', 'list', status, search] as const;
export const CLIENT_UNREAD_KEY = ['discussions', 'clients', 'unread-count'] as const;
export const clientDetailKey = (id: string) => ['discussions', 'clients', 'detail', id] as const;
export const clientMessagesKey = (id: string) => ['discussions', 'clients', 'messages', id] as const;
export const clientActionsKey = (id: string) => ['discussions', 'clients', 'actions', id] as const;
export const clientQuickRepliesKey = (id: string) =>
  ['discussions', 'clients', 'quick-replies', id] as const;

/** Intervalles de rafraîchissement, identiques à ceux du web. */
export const POLLING = {
  teamList: 15_000,
  teamMessages: 5_000,
  teamDetail: 15_000,
  teamInvitations: 30_000,
  clientList: 6_000,
  clientMessages: 4_000,
  clientUnread: 30_000,
} as const;
