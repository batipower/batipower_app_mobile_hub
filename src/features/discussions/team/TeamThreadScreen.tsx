import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { router, Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Archive,
  ArchiveRestore,
  Ellipsis,
  MessageSquarePlus,
  Users,
} from 'lucide-react-native';
import { toast } from 'sonner-native';

import { discussionsApi } from '@/api/discussions';
import { ESSENTIAL_REACTIONS } from '@/api/messageReactions';
import { useAuth } from '@/auth/AuthProvider';
import { EmptyState, ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { chooseAction } from '@/lib/actionSheet';
import { copyToClipboard } from '@/lib/clipboard';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type {
  GroupConversationParticipant,
  GroupConversationSummary,
  GroupMessage,
} from '@/types/discussions';

import { openTeamMembers } from '../navigation';
import { POLLING, TEAM_LIST_KEY, TEAM_ROOT_KEY, teamDetailKey, teamMessagesKey } from '../queryKeys';
import { scopeLabel } from '../shared/format';
import { usePollingInterval } from '../shared/usePolling';
import { MessageBubble } from './components/MessageBubble';
import { useMessageReactions } from './hooks/useMessageReactions';
import { useStableCallback } from './hooks/useStableCallback';
import { useTeamMessages } from './hooks/useTeamMessages';
import { TeamComposer } from './TeamComposer';
import { GROUPING_WINDOW_MS } from './teamHelpers';

/** Retire ou pose le compteur de non-lus d'une discussion dans toutes les listes en cache. */
function patchUnread(queryClient: QueryClient, conversationId: string, unreadCount: number) {
  queryClient.setQueriesData<GroupConversationSummary[]>({ queryKey: TEAM_LIST_KEY }, (old) =>
    Array.isArray(old)
      ? old.map((c) => (c.id === conversationId ? { ...c, unreadCount } : c))
      : old,
  );
}

/** Fil d'une discussion d'équipe : messages, réactions, pièces jointes, composer et actions d'en-tête. */
export function TeamThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <TeamThread conversationId={id} />;
}

function TeamThread({ conversationId }: { conversationId: string }) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const focused = useIsFocused();

  const detailInterval = usePollingInterval(POLLING.teamDetail);
  const reactionsInterval = usePollingInterval(POLLING.teamMessages);

  const detail = useQuery({
    queryKey: teamDetailKey(conversationId),
    queryFn: ({ signal }) => discussionsApi.get(conversationId, signal),
    refetchInterval: detailInterval,
  });
  const conversation = detail.data;

  const thread = useTeamMessages(conversationId);
  const { messages } = thread;

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { reactions, toggleReaction } = useMessageReactions(
    conversationId,
    messageIds,
    reactionsInterval,
  );

  // Liste inversée : le plus récent en bas, donc en tête du tableau.
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const isArchived = !!conversation?.archivedAt;
  const isDirect = conversation?.scope === 'DIRECT';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const canArchive =
    !!conversation &&
    conversation.scope !== 'DIRECT' &&
    (conversation.myRole === 'OWNER' || isSuperAdmin);

  // ─── Lecture ──────────────────────────────────────────────────────────────

  // Après « Marquer non lu », le fil ne doit plus se remarquer comme lu avant de se fermer.
  const skipMarkRead = useRef(false);

  const { mutate: markRead } = useMutation({
    mutationFn: () => discussionsApi.markAsRead(conversationId),
    onMutate: () => patchUnread(queryClient, conversationId, 0),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TEAM_LIST_KEY, refetchType: 'all' });
      void queryClient.invalidateQueries({ queryKey: teamDetailKey(conversationId) });
    },
  });

  const lastMessageId = messages[messages.length - 1]?.id;
  // À l'ouverture, puis à chaque nouveau message tant que le fil est affiché.
  useEffect(() => {
    if (!focused || skipMarkRead.current) return;
    markRead();
  }, [focused, lastMessageId, markRead]);

  const markUnread = useMutation({
    mutationFn: () => {
      skipMarkRead.current = true;
      return discussionsApi.markAsUnread(conversationId);
    },
    onMutate: () => patchUnread(queryClient, conversationId, 1),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TEAM_LIST_KEY, refetchType: 'all' });
      router.back();
    },
    onError: (error) => {
      skipMarkRead.current = false;
      patchUnread(queryClient, conversationId, 0);
      toast.error(errorMessage(error, 'Impossible de marquer la discussion comme non lue.'));
    },
  });

  // ─── Archivage ────────────────────────────────────────────────────────────

  const archive = useMutation({
    mutationFn: () => discussionsApi.archive(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TEAM_ROOT_KEY });
      toast.success('Discussion archivée.');
    },
    onError: (error) => toast.error(errorMessage(error, "Erreur lors de l'archivage.")),
  });

  const unarchive = useMutation({
    mutationFn: () => discussionsApi.unarchive(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TEAM_ROOT_KEY });
      toast.success('Discussion restaurée.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Erreur lors de la restauration.')),
  });

  const confirmArchive = () =>
    Alert.alert(
      'Archiver cette discussion ?',
      'Elle deviendra en lecture seule. Vous pourrez la restaurer plus tard.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Archiver', style: 'destructive', onPress: () => archive.mutate() },
      ],
    );

  const openHeaderMenu = async () => {
    if (!conversation) return;
    const choice = await chooseAction<'unread' | 'archive' | 'unarchive'>(conversation.title, [
      { label: 'Marquer comme non lu', value: 'unread' },
      ...(canArchive
        ? [
            isArchived
              ? { label: 'Restaurer la discussion', value: 'unarchive' as const }
              : { label: 'Archiver la discussion', value: 'archive' as const, destructive: true },
          ]
        : []),
    ]);
    if (choice === 'unread') markUnread.mutate();
    else if (choice === 'archive') confirmArchive();
    else if (choice === 'unarchive') unarchive.mutate();
  };

  // ─── Messages ─────────────────────────────────────────────────────────────

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => discussionsApi.deleteMessage(conversationId, messageId),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      void queryClient.invalidateQueries({ queryKey: teamMessagesKey(conversationId) });
      toast.success('Message supprimé.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Impossible de supprimer le message.')),
  });

  /** Appui long : réagir, copier le texte ou (pour l'auteur) supprimer. */
  const openMessageMenu = useStableCallback(async (message: GroupMessage) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    const mine = message.authorUserId === user?.id;
    const preview = message.content.length > 80 ? `${message.content.slice(0, 80)}…` : message.content;
    const choice = await chooseAction<'react' | 'copy' | 'delete'>(
      'Message',
      [
        { label: 'Réagir', value: 'react' },
        ...(message.content ? [{ label: 'Copier le texte', value: 'copy' as const }] : []),
        ...(mine ? [{ label: 'Supprimer le message', value: 'delete' as const, destructive: true }] : []),
      ],
      preview || undefined,
    );

    if (choice === 'react') {
      const current = reactions[message.id] ?? [];
      const emoji = await chooseAction<string>(
        'Réagir',
        ESSENTIAL_REACTIONS.map((e) => ({
          label: current.some((r) => r.emoji === e && r.reactedByMe) ? `${e}  (retirer)` : e,
          value: e,
        })),
      );
      if (emoji) toggleReaction(message.id, emoji);
    } else if (choice === 'copy') {
      void copyToClipboard(message.content, 'Message');
    } else if (choice === 'delete') {
      Alert.alert('Supprimer ce message ?', 'Il sera remplacé par « Message supprimé » pour tous.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMessage.mutate(message.id) },
      ]);
    }
  });

  const members = conversation?.members ?? NO_MEMBERS;

  const renderItem = ({ item, index }: ListRenderItemInfo<GroupMessage>) => {
    // L'élément suivant du tableau est le message précédent dans le temps.
    const older = data[index + 1];
    const grouped =
      !!older &&
      older.authorUserId === item.authorUserId &&
      new Date(item.createdAt).getTime() - new Date(older.createdAt).getTime() < GROUPING_WINDOW_MS;
    return (
      <View style={grouped ? styles.itemGrouped : styles.item}>
        <MessageBubble
          message={item}
          conversationId={conversationId}
          currentUserId={user?.id ?? null}
          isSuperAdmin={isSuperAdmin}
          grouped={grouped}
          members={members}
          reactions={reactions[item.id]}
          onToggleReaction={toggleReaction}
          onLongPress={openMessageMenu}
        />
      </View>
    );
  };

  // ─── Clavier ──────────────────────────────────────────────────────────────

  // `KeyboardAvoidingView` compare le clavier à des coordonnées relatives à son parent : on lui
  // donne la position réelle du fil dans la fenêtre (sous l'en-tête natif) comme décalage.
  const containerRef = useRef<ComponentRef<typeof View>>(null);
  const [topOffset, setTopOffset] = useState(0);

  const listRef = useRef<FlatList<GroupMessage>>(null);
  const scrollToLatest = () => listRef.current?.scrollToOffset({ offset: 0, animated: true });

  // ─── Rendu ────────────────────────────────────────────────────────────────

  const subtitle = conversation
    ? [
        conversation.scope === 'PRODUCT_SET'
          ? `${conversation.productCount} produit${conversation.productCount > 1 ? 's' : ''}`
          : scopeLabel(conversation.scope, conversation.categoryType, conversation.brand),
        isDirect
          ? null
          : `${conversation.memberCount} membre${conversation.memberCount > 1 ? 's' : ''}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const header = (
    <Stack.Screen
      options={{
        title: conversation?.title ?? 'Discussion',
        headerRight: conversation
          ? () => (
              <View style={styles.headerButtons}>
                {!isDirect ? (
                  <HeaderButton
                    label="Membres"
                    onPress={() => openTeamMembers(conversationId)}
                    icon={<Users size={20} color={t.accentText} />}
                  />
                ) : null}
                <HeaderButton
                  label="Plus d'actions"
                  onPress={() => void openHeaderMenu()}
                  icon={<Ellipsis size={22} color={t.accentText} />}
                />
              </View>
            )
          : undefined,
      }}
    />
  );

  if (detail.isPending) {
    return (
      <>
        {header}
        <View style={styles.statePad}>
          <ListSkeleton rows={4} height={72} />
        </View>
      </>
    );
  }

  if (!conversation) {
    return (
      <>
        {header}
        <View style={styles.statePad}>
          <ErrorBanner
            error={detail.error}
            fallback="Impossible de charger cette discussion."
            onRetry={() => void detail.refetch()}
          />
        </View>
      </>
    );
  }

  return (
    <>
      {header}
      <View
        ref={containerRef}
        style={styles.root}
        onLayout={() =>
          containerRef.current?.measureInWindow((_x, y) => {
            setTopOffset((previous) => (Math.abs(previous - y) < 1 ? previous : y));
          })
        }
      >
        <View style={styles.subtitleBar}>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          {isArchived ? (
            <View style={styles.archivedTag}>
              <Archive size={11} color={t.warning} />
              <Text style={styles.archivedTagText}>Archivée</Text>
            </View>
          ) : null}
        </View>

        {isArchived ? (
          <View style={styles.banner} accessibilityRole="alert">
            <Archive size={16} color={t.warning} />
            <Text style={styles.bannerText}>
              Cette discussion est archivée. Les nouveaux messages et invitations sont désactivés.
            </Text>
            {canArchive ? (
              <Pressable
                onPress={() => unarchive.mutate()}
                disabled={unarchive.isPending}
                accessibilityRole="button"
                accessibilityLabel="Restaurer la discussion"
                style={styles.bannerButton}
              >
                {unarchive.isPending ? (
                  <ActivityIndicator size="small" color={t.warning} />
                ) : (
                  <>
                    <ArchiveRestore size={14} color={t.warning} />
                    <Text style={styles.bannerButtonText}>Restaurer</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={topOffset}
          style={styles.flex}
        >
          <FlatList
            ref={listRef}
            inverted
            data={data}
            extraData={reactions}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={styles.flex}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            onEndReached={() => void thread.loadOlder()}
            onEndReachedThreshold={0.4}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={9}
            ListFooterComponent={
              thread.loadingOlder ? (
                <View style={styles.olderLoader}>
                  <ActivityIndicator color={t.accentText} />
                </View>
              ) : thread.hasOlder ? (
                <Pressable
                  onPress={() => void thread.loadOlder()}
                  accessibilityRole="button"
                  accessibilityLabel="Afficher les messages précédents"
                  style={styles.olderButton}
                >
                  <Text style={styles.olderText}>Afficher les messages précédents</Text>
                </Pressable>
              ) : undefined
            }
            ListEmptyComponent={
              thread.isLoading ? (
                <ListSkeleton rows={4} height={64} />
              ) : thread.error ? (
                <ErrorBanner
                  error={thread.error}
                  fallback="Impossible de charger les messages."
                  onRetry={() => void thread.refetch()}
                />
              ) : (
                <EmptyState
                  icon={<MessageSquarePlus size={24} color={t.accentText} />}
                  title="Démarrez la conversation"
                  text="Aucun message pour le moment. Postez le premier message ci-dessous pour échanger avec les membres de cette discussion."
                />
              )
            }
          />
          <TeamComposer
            conversationId={conversationId}
            archived={isArchived}
            onSent={scrollToLatest}
          />
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const keyExtractor = (message: GroupMessage) => message.id;

const NO_MEMBERS: readonly GroupConversationParticipant[] = [];

type HeaderButtonProps = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
};

function HeaderButton({ label, icon, onPress }: HeaderButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={styles.headerButton}
    >
      {icon}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  flex: { flex: 1 },
  statePad: { padding: spacing.xl },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerButton: {
    width: hitTarget - 4,
    height: hitTarget - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  subtitle: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  archivedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: withAlpha(t.warning, 0.14),
  },
  archivedTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.warning,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.4),
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  bannerText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.text },
  bannerButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.5),
  },
  bannerButtonText: { fontSize: fontSize.xs, fontWeight: '700', color: t.warning },
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexGrow: 1 },
  item: { marginTop: spacing.md },
  itemGrouped: { marginTop: 3 },
  olderLoader: { paddingVertical: spacing.lg },
  olderButton: {
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  olderText: { fontSize: fontSize.xs, fontWeight: '600', color: t.accentText },
}));
