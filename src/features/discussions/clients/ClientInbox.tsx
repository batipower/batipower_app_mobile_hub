import { useCallback, useState, type ReactElement } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailQuestion } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { supportChatApi } from '@/api/supportChat';
import { Chip } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { chooseAction } from '@/lib/actionSheet';
import { makeStyles, spacing, useTheme } from '@/theme';
import type { ListSupportConversationsResult, SupportConversation, SupportConversationStatus } from '@/types/supportChat';

import { openClientThread } from '../navigation';
import { CLIENT_LIST_KEY, CLIENT_UNREAD_KEY, POLLING, clientListKey } from '../queryKeys';
import { usePollingInterval } from '../shared/usePolling';
import { ClientConversationRow } from './ClientConversationRow';

type StatusFilter = 'ALL' | SupportConversationStatus;

const FILTERS: readonly { key: StatusFilter; label: string }[] = [
  { key: 'OPEN', label: 'Ouvertes' },
  { key: 'CLOSED', label: 'Fermées' },
  { key: 'ALL', label: 'Toutes' },
];

/** Comme le web : la recherche serveur ne part qu'à partir de 2 caractères. */
const MIN_SERVER_SEARCH = 2;

type ClientInboxProps = {
  /** Saisie du champ de recherche posé au-dessus de la liste par l'écran. */
  search: string;
};

/**
 * Liste des conversations clients (`support-chat/staff`) : statut, recherche, non-lus. Le
 * titre, le contrôle Équipe / Clients et la recherche sont dans l'en-tête de l'écran.
 */
export function ClientInbox({ search }: ClientInboxProps) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('OPEN');
  const debounced = useDebouncedTerm(search);
  const term = debounced.length >= MIN_SERVER_SEARCH ? debounced : '';
  const interval = usePollingInterval(POLLING.clientList);

  const list = useQuery({
    queryKey: clientListKey(status, term),
    queryFn: ({ signal }) =>
      supportChatApi.list({ status: status === 'ALL' ? undefined : status, search: term }, signal),
    refetchInterval: interval,
    // Garde la liste affichée pendant un changement de filtre ou de recherche.
    placeholderData: keepPreviousData,
  });
  const refresh = usePullToRefresh(useCallback(() => list.refetch(), [list]));
  const conversations = list.data?.data ?? [];

  const patchUnread = useCallback(
    (id: string, unread: boolean) => {
      queryClient.setQueriesData<ListSupportConversationsResult>(
        { queryKey: CLIENT_LIST_KEY },
        (old) =>
          old ? { ...old, data: old.data.map((c) => (c.id === id ? { ...c, unread } : c)) } : old,
      );
    },
    [queryClient],
  );
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: CLIENT_LIST_KEY });
    void queryClient.invalidateQueries({ queryKey: CLIENT_UNREAD_KEY });
  }, [queryClient]);

  const markRead = useMutation({
    mutationFn: (id: string) => supportChatApi.markRead(id),
    onMutate: (id) => patchUnread(id, false),
    onSettled: invalidate,
    onError: (error) => toast.error(errorMessage(error, 'Impossible de marquer comme lu.')),
  });
  const markUnread = useMutation({
    mutationFn: (id: string) => supportChatApi.markUnread(id),
    onMutate: (id) => patchUnread(id, true),
    onSettled: invalidate,
    onError: (error) => toast.error(errorMessage(error, 'Impossible de marquer comme non lu.')),
  });

  const openActions = useCallback(
    async (conversation: SupportConversation) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const choice = await chooseAction(conversation.customerName || conversation.customerEmail, [
        conversation.unread
          ? { label: 'Marquer comme lu', value: 'read' as const }
          : { label: 'Marquer comme non lu', value: 'unread' as const },
      ]);
      if (choice === 'read') markRead.mutate(conversation.id);
      if (choice === 'unread') markUnread.mutate(conversation.id);
    },
    [markRead, markUnread],
  );

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={status === f.key} onPress={() => setStatus(f.key)} />
        ))}
      </View>
      {list.isError && list.data ? (
        <ErrorBanner
          error={list.error}
          fallback="Les conversations n'ont pas pu être actualisées."
          onRetry={() => void list.refetch()}
        />
      ) : null}
    </View>
  );

  let empty: ReactElement;
  if (list.isPending) empty = <ListSkeleton rows={5} height={96} />;
  else if (list.isError) {
    empty = (
      <ErrorBanner
        error={list.error}
        fallback="Impossible de charger les conversations."
        onRetry={() => void list.refetch()}
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={<MailQuestion size={24} color={t.textMuted} />}
        title={term ? 'Aucune conversation trouvée' : 'Aucune conversation'}
        text={
          term
            ? `Rien ne correspond à « ${term} ».`
            : status === 'CLOSED'
              ? 'Aucune conversation fermée.'
              : 'Les messages des clients du site apparaîtront ici.'
        }
      />
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <ClientConversationRow
          conversation={item}
          onPress={(c) => openClientThread(c.id)}
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
