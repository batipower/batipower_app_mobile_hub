import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, CheckCheck } from 'lucide-react-native';

import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { roleLabel } from '@/modules/roles';
import {
  fontSize,
  makeStyles,
  monoFontFamily,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import type {
  GroupConversationParticipant,
  GroupMessage,
  ReactionSummaryDto,
} from '@/types/discussions';

import { Avatar } from '../../shared/Avatar';
import { formatFullDateTime } from '../../shared/format';
import { effectiveModules, messageCards, messageReaders } from '../teamHelpers';
import { FileAttachmentRow } from './FileAttachmentRow';
import { OpportunityCard } from './OpportunityCard';
import { ReactionPills } from './ReactionPills';
import { RenegotiationCard } from './RenegotiationCard';

const MAX_READER_AVATARS = 4;

type MessageBubbleProps = {
  message: GroupMessage;
  conversationId: string;
  currentUserId: string | null;
  isSuperAdmin: boolean;
  /** Message de même auteur, à moins de 5 min du précédent : en-tête et avatar masqués. */
  grouped: boolean;
  members: readonly GroupConversationParticipant[];
  reactions: readonly ReactionSummaryDto[] | undefined;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onLongPress: (message: GroupMessage) => void;
};

const NO_REACTIONS: readonly ReactionSummaryDto[] = [];

/**
 * Message du fil Équipe : avatar, nom, rôle et modules de l'auteur, bulle (texte, cartes,
 * fichiers), réactions et accusés de lecture. Un appui long ouvre le menu du message.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  conversationId,
  currentUserId,
  isSuperAdmin,
  grouped,
  members,
  reactions,
  onToggleReaction,
  onLongPress,
}: MessageBubbleProps) {
  const styles = useStyles();
  const t = useTheme();
  const isMine = message.authorUserId === currentUserId;
  const deleted = !!message.deletedAt;
  const cards = useMemo(() => messageCards(message), [message]);
  const files = message.fileAttachments ?? [];
  const hasAttachments = cards.length > 0 || files.length > 0;
  const readers = useMemo(
    () => messageReaders(message, members, currentUserId),
    [message, members, currentUserId],
  );

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      {!isMine ? (
        <View style={styles.avatarSlot}>
          {!grouped ? <Avatar name={message.authorName} size={32} /> : null}
        </View>
      ) : null}

      <View
        style={[
          styles.column,
          isMine ? styles.columnMine : styles.columnOther,
          isMine && hasAttachments && styles.columnWide,
        ]}
      >
        {!grouped ? (
          <View style={[styles.header, isMine && styles.headerMine]}>
            {!isMine ? (
              <>
                <Text style={styles.author} numberOfLines={1}>
                  {message.authorName}
                </Text>
                {message.authorUserCode ? (
                  <Text style={styles.code}>{message.authorUserCode}</Text>
                ) : null}
                <View style={styles.roleChip}>
                  <Text style={styles.roleText} numberOfLines={1}>
                    {roleLabel(message.authorRole)}
                  </Text>
                </View>
                {effectiveModules(message.authorModules).map((module) => (
                  <ModuleBadge key={module} module={module} size="sm" />
                ))}
              </>
            ) : null}
            <Text style={styles.time}>{formatFullDateTime(message.createdAt)}</Text>
          </View>
        ) : null}

        <Pressable
          onLongPress={deleted ? undefined : () => onLongPress(message)}
          delayLongPress={350}
          // Le texte porte l'étiquette d'accessibilité : les fichiers et cartes restent atteignables.
          accessible={false}
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
            deleted && styles.bubbleDeleted,
            hasAttachments && styles.bubbleWide,
          ]}
        >
          {deleted ? (
            <Text
              accessible
              accessibilityLabel={`Message supprimé de ${message.authorName}`}
              style={[styles.text, styles.textDeleted]}
            >
              Message supprimé
            </Text>
          ) : (
            <>
              {message.content ? (
                <Text
                  accessible
                  accessibilityLabel={`${isMine ? 'Vous' : message.authorName} : ${message.content}`}
                  accessibilityHint="Actions disponibles : réagir, copier, supprimer"
                  accessibilityActions={[{ name: 'activate', label: 'Ouvrir les actions du message' }]}
                  onAccessibilityAction={() => onLongPress(message)}
                  style={[styles.text, isMine && styles.textMine]}
                >
                  {message.content}
                </Text>
              ) : null}
              {cards.length > 0 ? (
                <View style={[styles.stack, !!message.content && styles.stackSpaced]}>
                  {cards.map((card) =>
                    card.type === 'OPPORTUNITY' ? (
                      <OpportunityCard key={`OPP:${card.opportunityUuid}`} attachment={card} />
                    ) : (
                      <RenegotiationCard key={`REN:${card.renegotiationUuid}`} attachment={card} />
                    ),
                  )}
                </View>
              ) : null}
              {files.length > 0 ? (
                <View
                  style={[styles.stack, (!!message.content || cards.length > 0) && styles.stackSpaced]}
                >
                  {files.map((file) => (
                    <FileAttachmentRow
                      key={file.id}
                      file={file}
                      conversationId={conversationId}
                      canTogglePermanent={isMine || isSuperAdmin}
                    />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </Pressable>

        {!deleted ? (
          <>
            <ReactionPills
              messageId={message.id}
              reactions={reactions ?? NO_REACTIONS}
              onToggle={onToggleReaction}
            />
            {isMine || readers.length > 0 ? (
              <View
                style={styles.receipts}
                accessible
                accessibilityLabel={
                  readers.length > 0
                    ? `Lu par ${readers.map((r) => r.name).join(', ')}`
                    : 'Envoyé, pas encore lu'
                }
              >
                {isMine ? (
                  readers.length > 0 ? (
                    <CheckCheck size={14} color={t.accentText} />
                  ) : (
                    <Check size={14} color={t.textSubtle} />
                  )
                ) : null}
                {readers.slice(0, MAX_READER_AVATARS).map((reader) => (
                  <Avatar key={reader.userId} name={reader.name} size={14} />
                ))}
                {readers.length > MAX_READER_AVATARS ? (
                  <Text style={styles.overflow}>+{readers.length - MAX_READER_AVATARS}</Text>
                ) : null}
                {isMine && readers.length === 0 ? <Text style={styles.sent}>Envoyé</Text> : null}
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  avatarSlot: { width: 32, alignSelf: 'flex-start' },
  column: { maxWidth: '84%', flexShrink: 1 },
  columnMine: { alignItems: 'flex-end' },
  columnOther: { alignItems: 'flex-start', flex: 1, maxWidth: '86%' },
  columnWide: { width: '84%' },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  headerMine: { justifyContent: 'flex-end' },
  author: { flexShrink: 1, fontSize: fontSize.xs, fontWeight: '700', color: t.text },
  code: { fontSize: 11, fontFamily: monoFontFamily, color: t.textMuted },
  roleChip: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: t.surfaceStrong,
  },
  roleText: { fontSize: 10, color: t.textMuted },
  time: { fontSize: 11, color: t.textSubtle },
  bubble: {
    maxWidth: '100%',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl + 4,
    borderWidth: 1,
  },
  bubbleWide: { alignSelf: 'stretch' },
  bubbleMine: {
    borderColor: t.accent,
    backgroundColor: t.accent,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    borderColor: t.border,
    backgroundColor: t.card,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleDeleted: {
    borderColor: t.border,
    borderStyle: 'dashed',
    backgroundColor: withAlpha(t.textMuted, 0.06),
  },
  text: { fontSize: fontSize.sm, lineHeight: 20, color: t.text },
  textMine: { color: t.onAccent },
  textDeleted: { fontStyle: 'italic', color: t.textMuted },
  stack: { gap: spacing.sm },
  stackSpaced: { marginTop: spacing.sm },
  receipts: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.xs },
  overflow: { fontSize: 10, fontWeight: '700', color: t.textMuted },
  sent: { fontSize: 11, color: t.textSubtle },
}));
