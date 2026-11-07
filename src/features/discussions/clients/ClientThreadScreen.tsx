import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ellipsis, MessageSquareDashed, Wrench } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubProductSheet } from '@/auth/permissions';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { openOrder, openProduct } from '@/features/search/navigation';
import { chooseAction } from '@/lib/actionSheet';
import { hitTarget, makeStyles, spacing, useTheme } from '@/theme';
import type { SupportConversation } from '@/types/supportChat';

import { openClientAction } from '../navigation';
import { ClientAiAssistPanel, AiProgressBar } from './ClientAiAssistPanel';
import { ClientComposer } from './ClientComposer';
import { ClientMessageBubble } from './ClientMessageBubble';
import { ClientThreadInfoBar } from './ClientThreadInfoBar';
import { resetDraftAiState } from './draftStore';
import { buildThreadRows, type ThreadRow } from './threadRows';
import { useAiAssist } from './useAiAssist';
import {
  useAutoMarkRead,
  useClientConversation,
  useClientMessages,
  useMarkClientUnread,
  useToggleClientStatus,
} from './useClientThread';

const keyExtractor = (row: ThreadRow) => row.key;

/** Fil d'une conversation cliente (route `discussions/clients/[id]`). */
export function ClientThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <ClientThread id={id} />;
}

function ClientThread({ id }: { id: string }) {
  const styles = useStyles();
  const t = useTheme();
  const { user } = useAuth();
  const listRef = useRef<FlatList<ThreadRow>>(null);
  const containerRef = useRef<ComponentRef<typeof View>>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const conversationQuery = useClientConversation(id);
  const messagesQuery = useClientMessages(id);
  const conversation = conversationQuery.data;
  const messages = messagesQuery.data;

  const ai = useAiAssist(id);
  const suspendAutoRead = useAutoMarkRead(id, messages);
  const toggleStatus = useToggleClientStatus(id);
  const markUnread = useMarkClientUnread();

  // Quitter le fil : l'analyse IA et les actions proposées n'ont plus de sens, le texte reste.
  useEffect(() => () => resetDraftAiState(id), [id]);

  const rows = useMemo(() => buildThreadRows(messages ?? []), [messages]);
  const lastFromCustomer = messages?.[messages.length - 1]?.sender === 'CUSTOMER';
  const canOpenProduct = !!user && canAccessHubProductSheet(user.role);

  const title = conversation?.customerName || conversation?.customerEmail || 'Client';
  const closed = conversation?.status === 'CLOSED';

  const scrollToLatest = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  function confirmToggleStatus(current: SupportConversation) {
    const closing = current.status === 'OPEN';
    Alert.alert(
      closing ? 'Fermer la conversation ?' : 'Rouvrir la conversation ?',
      closing
        ? 'Vous pourrez la rouvrir à tout moment, ou elle se rouvrira si vous envoyez un message.'
        : 'La conversation repassera dans les conversations ouvertes.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: closing ? 'Fermer' : 'Rouvrir',
          style: closing ? 'destructive' : 'default',
          onPress: () => toggleStatus.mutate(current.status),
        },
      ],
    );
  }

  async function openMenu() {
    if (!conversation) return;
    const choice = await chooseAction<'toggle' | 'unread'>(title, [
      {
        label: conversation.status === 'OPEN' ? 'Fermer la conversation' : 'Rouvrir la conversation',
        value: 'toggle',
      },
      ...(lastFromCustomer ? [{ label: 'Marquer comme non lu', value: 'unread' as const }] : []),
    ]);
    if (choice === 'toggle') confirmToggleStatus(conversation);
    if (choice === 'unread') {
      // Sans cela, le marquage automatique relirait aussitôt le fil.
      suspendAutoRead();
      markUnread.mutate(id, { onSuccess: () => router.back() });
    }
  }

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ThreadRow>) =>
      item.kind === 'date' ? (
        <View style={styles.dateWrap}>
          <Text style={styles.dateLabel}>{item.label}</Text>
        </View>
      ) : (
        <ClientMessageBubble message={item.message} showAuthor={item.showAuthor} />
      ),
    [styles],
  );

  const notFound =
    conversationQuery.error instanceof ApiError && conversationQuery.error.status === 404;
  const initialError = !messages && messagesQuery.isError;

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <HeaderButton
                label="Actions SAV"
                icon={<Wrench size={20} color={t.accentText} />}
                onPress={() => openClientAction(id)}
              />
              <HeaderButton
                label="Plus d’actions"
                icon={<Ellipsis size={22} color={t.accentText} />}
                disabled={!conversation}
                onPress={() => void openMenu()}
              />
            </View>
          ),
        }}
      />
      <View
        ref={containerRef}
        style={styles.root}
        // Distance entre le haut de l'écran et le contenu (en-tête natif compris) : c'est le
        // décalage dont `KeyboardAvoidingView` a besoin pour ne pas laisser de vide.
        onLayout={() =>
          containerRef.current?.measureInWindow((_x, y) => setKeyboardOffset(Math.round(y)))
        }
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardOffset}
          style={styles.root}
        >
          {conversation ? (
            <ClientThreadInfoBar
              conversation={conversation}
              canOpenProduct={canOpenProduct}
              onOpenOrder={openOrder}
              onOpenProduct={openProduct}
            />
          ) : null}

          {notFound ? (
            <EmptyState
              icon={<MessageSquareDashed size={26} color={t.textMuted} />}
              title="Conversation introuvable"
              text="Elle a peut-être été supprimée."
            />
          ) : !messages ? (
            initialError ? (
              <View style={styles.statePad}>
                <ErrorBanner
                  error={messagesQuery.error}
                  fallback="Impossible de charger les messages."
                  onRetry={() => void messagesQuery.refetch()}
                />
              </View>
            ) : (
              <View style={styles.statePad}>
                <ListSkeleton rows={4} height={64} />
              </View>
            )
          ) : (
            <>
              {messagesQuery.isError ? (
                <View style={styles.bannerPad}>
                  <ErrorBanner
                    error={messagesQuery.error}
                    fallback="Actualisation impossible."
                    onRetry={() => void messagesQuery.refetch()}
                  />
                </View>
              ) : null}
              {rows.length === 0 ? (
                <EmptyState
                  icon={<MessageSquareDashed size={26} color={t.textMuted} />}
                  title="Aucun message"
                  text="Les échanges avec le client apparaîtront ici."
                />
              ) : (
                <FlatList
                  ref={listRef}
                  style={styles.list}
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
            </>
          )}

          <AiProgressBar ai={ai} />
          <ClientAiAssistPanel conversationId={id} ai={ai} />
          <ClientComposer
            conversationId={id}
            closed={!!closed}
            ai={ai}
            onSent={scrollToLatest}
          />
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

type HeaderButtonProps = {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onPress: () => void;
};

function HeaderButton({ label, icon, disabled = false, onPress }: HeaderButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={[styles.headerButton, disabled && { opacity: 0.4 }]}
    >
      {icon}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  headerButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statePad: { padding: spacing.lg, flex: 1 },
  bannerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  dateWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  dateLabel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    fontSize: 11,
    fontWeight: '700',
    color: t.textSubtle,
  },
}));
