import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { discussionsApi } from '@/api/discussions';
import { Chip } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { chooseAction } from '@/lib/actionSheet';
import { makeStyles, spacing, useTheme } from '@/theme';
import type { GroupConversationSummary } from '@/types/discussions';

import { openInvitations, openTeamThread } from '../navigation';
import {
  POLLING,
  TEAM_INVITATIONS_KEY,
  TEAM_LIST_KEY,
  teamListKey,
} from '../queryKeys';
import { categoryTypeLabel } from '../shared/format';
import { usePollingInterval } from '../shared/usePolling';
import { InboxInvitationsBanner } from './InboxInvitationsBanner';
import { TeamConversationRow } from './TeamConversationRow';

type TeamTab = 'active' | 'archived';

type TeamInboxProps = {
  /** Saisie du champ de recherche posé au-dessus de la liste par l'écran. */
  search: string;
};

/**
 * Liste des discussions d'équipe : actives ou archivées, non lus, invitations en attente. Le
 * titre, le contrôle Équipe / Clients, la recherche et le bouton « Nouvelle discussion » sont
 * dans l'en-tête de l'écran : la liste commence directement par les filtres.
 */
export function TeamInbox({ search }: TeamInboxProps) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TeamTab>('active');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const listInterval = usePollingInterval(POLLING.teamList);
  const invitationsInterval = usePollingInterval(POLLING.teamInvitations);

  const list = useQuery({
    queryKey: teamListKey(tab),
    queryFn: ({ signal }) => discussionsApi.list({ archived: tab, signal }),
    refetchInterval: listInterval,
  });
  const invitations = useQuery({
    queryKey: TEAM_INVITATIONS_KEY,
    queryFn: ({ signal }) => discussionsApi.listInvitations(signal),
    refetchInterval: invitationsInterval,
  });
  const invitationsCount = invitations.data?.length ?? 0;

  const refresh = usePullToRefresh(
    useCallback(
      () => Promise.all([list.refetch(), invitations.refetch()]),
      [list, invitations],
    ),
  );

  /** Met à jour tout de suite le compteur de non-lus dans les listes en cache. */
  const patchUnread = useCallback(
    (id: string, unreadCount: number) => {
      for (const key of [teamListKey('active'), teamListKey('archived')]) {
        queryClient.setQueryData<GroupConversationSummary[]>(key, (old) =>
          old?.map((c) => (c.id === id ? { ...c, unreadCount } : c)),
        );
      }
    },
    [queryClient],
  );

  const markRead = useMutation({
    mutationFn: (id: string) => discussionsApi.markAsRead(id),
    onMutate: (id) => patchUnread(id, 0),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: TEAM_LIST_KEY }),
    onError: (error) => toast.error(errorMessage(error, 'Impossible de marquer comme lu.')),
  });
  const markUnread = useMutation({
    mutationFn: (id: string) => discussionsApi.markAsUnread(id),
    onMutate: (id) => patchUnread(id, 1),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: TEAM_LIST_KEY }),
    onError: (error) => toast.error(errorMessage(error, 'Impossible de marquer comme non lu.')),
  });

  const openActions = useCallback(
    async (conversation: GroupConversationSummary) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const unread = conversation.unreadCount > 0;
      const choice = await chooseAction(conversation.title, [
        unread
          ? { label: 'Marquer comme lu', value: 'read' as const }
          : { label: 'Marquer comme non lu', value: 'unread' as const },
      ]);
      if (choice === 'read') markRead.mutate(conversation.id);
      if (choice === 'unread') markUnread.mutate(conversation.id);
    },
    [markRead, markUnread],
  );

  const conversations = useMemo(() => {
    let result = list.data ?? [];
    if (unreadOnly && tab === 'active') result = result.filter((c) => c.unreadCount > 0);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.categoryType && categoryTypeLabel(c.categoryType).toLowerCase().includes(q)) ||
          (c.brand && c.brand.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [list.data, unreadOnly, tab, search]);

  const unreadTotal = useMemo(
    () => (tab === 'active' ? (list.data ?? []).reduce((n, c) => n + c.unreadCount, 0) : 0),
    [list.data, tab],
  );

  const listHeader = (
    <View style={styles.header}>
      <InboxInvitationsBanner count={invitationsCount} onPress={openInvitations} />
      <View style={styles.filters}>
        <Chip label="Actives" active={tab === 'active'} onPress={() => setTab('active')} />
        <Chip label="Archives" active={tab === 'archived'} onPress={() => setTab('archived')} />
        {tab === 'active' ? (
          <Chip
            label="Non lus"
            count={unreadTotal > 0 ? unreadTotal : undefined}
            active={unreadOnly}
            onPress={() => setUnreadOnly((v) => !v)}
          />
        ) : null}
      </View>
      {list.isError && list.data ? (
        <ErrorBanner
          error={list.error}
          fallback="Les discussions n'ont pas pu être actualisées."
          onRetry={() => void list.refetch()}
        />
      ) : null}
    </View>
  );

  let empty: ReactElement | null = null;
  if (list.isPending) empty = <ListSkeleton rows={5} height={92} />;
  else if (list.isError) {
    empty = (
      <ErrorBanner
        error={list.error}
        fallback="Impossible de charger les discussions."
        onRetry={() => void list.refetch()}
      />
    );
  } else {
    const filtered = search.trim() !== '' || unreadOnly;
    empty = (
      <EmptyState
        icon={<MessagesSquare size={24} color={t.textMuted} />}
        title={
          filtered
            ? 'Aucune discussion trouvée'
            : tab === 'archived'
              ? 'Aucune discussion archivée'
              : 'Aucune discussion'
        }
        text={
          filtered
            ? 'Modifiez la recherche ou le filtre pour voir plus de résultats.'
            : tab === 'archived'
              ? 'Les discussions archivées apparaîtront ici.'
              : 'Démarrez une discussion pour échanger avec vos collègues.'
        }
      />
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <TeamConversationRow
          conversation={item}
          onPress={(c) => openTeamThread(c.id)}
          onLongPress={(c) => void openActions(c)}
        />
      )}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={empty}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refresh.refreshing}
          onRefresh={() => void refresh.onRefresh()}
          tintColor={t.accentText}
        />
      }
    />
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles(() => ({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
  header: { gap: spacing.md, paddingBottom: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  separator: { height: spacing.md },
}));
