import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, MessageSquareDashed } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { Avatar } from '@/features/discussions/shared/Avatar';
import { formatFullDateTime } from '@/features/discussions/shared/format';
import {
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  errorMessage,
} from '@/features/preparation/components/ListState';
import { roleLabel } from '@/modules/roles';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

/** Longueur maximale d'un message envoyé depuis le mobile. */
const MESSAGE_MAX_LENGTH = 2000;

/** Message d'un fil PARTNER, normalisé par chaque module (produit, opportunité, inter-agence, BL). */
export type ConversationMessage = {
  id: string;
  authorName: string;
  authorRole?: string | null;
  content: string;
  createdAt: string;
  /** Écrit par le compte connecté : bulle à droite. */
  mine: boolean;
  /** Évènement système (transition, changement de prix) : ligne centrée, sans bulle. */
  system?: boolean;
};

type ConversationScreenProps = {
  queryKey: readonly unknown[];
  load: (signal: AbortSignal) => Promise<ConversationMessage[]>;
  send: (content: string) => Promise<unknown>;
  /** Autres caches à recaler après un envoi (compteur de messages d'une liste, d'une fiche…). */
  invalidate?: readonly (readonly unknown[])[];
  emptyText: string;
  placeholder?: string;
  /** Raison affichée à la place du composeur quand l'envoi est fermé au compte. */
  composerLockedReason?: string | null;
};

const keyExtractor = (message: ConversationMessage) => message.id;

/**
 * Fil de discussion générique des modules PARTNER : messages (liste inversée, le plus récent en
 * bas) et composeur. Chaque module fournit le chargement, l'envoi et la mise en forme des
 * messages ; le fil se recale toutes les 15 secondes tant qu'il est ouvert.
 */
export function ConversationScreen({
  queryKey,
  load,
  send,
  invalidate = [],
  emptyText,
  placeholder = 'Écrivez votre message…',
  composerLockedReason = null,
}: ConversationScreenProps) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const containerRef = useRef<ComponentRef<typeof View>>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [text, setText] = useState('');

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => load(signal),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) => send(content),
    onSuccess: () => {
      setText('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      void queryClient.invalidateQueries({ queryKey });
      invalidate.forEach((key) => void queryClient.invalidateQueries({ queryKey: key }));
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    onError: (error) => toast.error(errorMessage(error, "Impossible d'envoyer le message.")),
  });

  // La liste est inversée : le plus récent d'abord dans les données, affiché en bas.
  const rows = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [query.data],
  );

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !sendMessage.isPending;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ConversationMessage>) => <MessageRow message={item} />,
    [],
  );

  return (
    <View
      ref={containerRef}
      style={styles.root}
      // Distance entre le haut de l'écran et le contenu : décalage dont `KeyboardAvoidingView`
      // a besoin pour ne pas laisser de vide au-dessus du clavier.
      onLayout={() =>
        containerRef.current?.measureInWindow((_x, y) => setKeyboardOffset(Math.round(y)))
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
        style={styles.root}
      >
        {query.isPending ? (
          <View style={styles.pad}>
            <ListSkeleton rows={4} height={64} />
          </View>
        ) : query.isError && !query.data ? (
          <View style={styles.pad}>
            <ErrorBanner
              error={query.error}
              fallback="Impossible de charger les messages."
              onRetry={() => void query.refetch()}
            />
          </View>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<MessageSquareDashed size={26} color={t.textMuted} />}
            title="Aucun message"
            text={emptyText}
          />
        ) : (
          <FlatList
            ref={listRef}
            style={styles.root}
            data={rows}
            inverted
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            windowSize={11}
          />
        )}

        {composerLockedReason ? (
          <Text style={styles.locked}>{composerLockedReason}</Text>
        ) : (
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              editable={!sendMessage.isPending}
              multiline
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder={placeholder}
              placeholderTextColor={t.textFaint}
              selectionColor={t.accentText}
              keyboardAppearance={t.scheme}
              textAlignVertical="top"
              accessibilityLabel="Message"
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Envoyer"
              accessibilityState={{ disabled: !canSend, busy: sendMessage.isPending }}
              disabled={!canSend}
              onPress={() => sendMessage.mutate(trimmed)}
              style={[styles.sendButton, !canSend && styles.disabled]}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator size="small" color={t.onAccent} />
              ) : (
                <ArrowUp size={20} color={t.onAccent} strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function MessageRow({ message }: { message: ConversationMessage }) {
  const styles = useStyles();

  if (message.system) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.content}</Text>
        <Text style={styles.systemDate}>{formatFullDateTime(message.createdAt)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, message.mine && styles.rowMine]}>
      {message.mine ? null : <Avatar name={message.authorName} size={32} />}
      <View style={[styles.bubble, message.mine ? styles.bubbleMine : styles.bubbleOther]}>
        {message.mine ? null : (
          <Text style={styles.author} numberOfLines={1}>
            {message.authorName}
            {message.authorRole ? ` · ${roleLabel(message.authorRole)}` : ''}
          </Text>
        )}
        <Text style={[styles.content, message.mine && styles.contentMine]} selectable>
          {message.content}
        </Text>
        <Text style={[styles.date, message.mine && styles.dateMine]}>
          {formatFullDateTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  pad: { padding: spacing.xl },
  listContent: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingRight: spacing['3xl'] },
  rowMine: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: spacing['3xl'] },
  bubble: {
    flexShrink: 1,
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  bubbleOther: { backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
  bubbleMine: { backgroundColor: t.accent },
  author: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
  content: { fontSize: fontSize.sm, lineHeight: 20, color: t.text },
  contentMine: { color: t.onAccent },
  date: { fontSize: 10, color: t.textFaint },
  dateMine: { color: withAlpha(t.onAccent, 0.75), textAlign: 'right' },
  systemWrap: { alignItems: 'center', gap: 2, paddingHorizontal: spacing.lg },
  systemText: { fontSize: fontSize.xs, color: t.textMuted, textAlign: 'center' },
  systemDate: { fontSize: 10, color: t.textFaint },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bg,
  },
  input: {
    flex: 1,
    minHeight: hitTarget,
    maxHeight: 140,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    fontSize: fontSize.sm,
    color: t.text,
  },
  sendButton: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
  },
  disabled: { opacity: 0.4 },
  locked: {
    padding: spacing.lg,
    fontSize: fontSize.xs,
    color: t.textMuted,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: t.border,
  },
}));
