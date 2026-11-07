import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Archive, Folder, MessageSquare, Package, Tag, User, type LucideIcon } from 'lucide-react-native';

import { fontSize, makeStyles, radius, shadow, spacing, useTheme, withAlpha } from '@/theme';
import type { GroupConversationSummary, GroupDiscussionScope } from '@/types/discussions';

import { badgeCount, categoryTypeLabel, formatLastMessageAt } from '../shared/format';

const SCOPE_ICON: Record<GroupDiscussionScope, LucideIcon> = {
  CATEGORY: Folder,
  BRAND: Tag,
  FREE: MessageSquare,
  DIRECT: User,
  PRODUCT_SET: Package,
};

/** Sous-titre de la ligne : service, marque, nombre de produits… */
function scopeText(c: GroupConversationSummary): string {
  switch (c.scope) {
    case 'CATEGORY':
      return categoryTypeLabel(c.categoryType);
    case 'BRAND':
      return c.brand ?? 'Marque';
    case 'FREE':
      return 'Discussion libre';
    case 'DIRECT':
      return 'Message direct';
    default:
      return `${c.productCount} produit${c.productCount > 1 ? 's' : ''}`;
  }
}

type TeamConversationRowProps = {
  conversation: GroupConversationSummary;
  onPress: (conversation: GroupConversationSummary) => void;
  onLongPress: (conversation: GroupConversationSummary) => void;
};

/** Discussion d'équipe dans la liste : titre, dernier message, heure et pastille de non-lus. */
function TeamConversationRowBase({ conversation, onPress, onLongPress }: TeamConversationRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const Icon = SCOPE_ICON[conversation.scope] ?? Package;
  const archived = !!conversation.archivedAt;
  const unread = conversation.unreadCount > 0;
  const last = conversation.lastMessage;
  const preview = last
    ? conversation.scope === 'DIRECT'
      ? last.content
      : `${last.authorName} : ${last.content}`
    : 'Aucun message';
  const time = formatLastMessageAt(conversation.lastMessageAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        conversation.title,
        unread ? `${conversation.unreadCount} non lu${conversation.unreadCount > 1 ? 's' : ''}` : null,
        archived ? 'archivée' : null,
        preview,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Appui long : marquer comme lu ou non lu"
      onPress={() => onPress(conversation)}
      onLongPress={() => onLongPress(conversation)}
      style={({ pressed }) => [
        styles.row,
        unread && styles.rowUnread,
        archived && styles.archived,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, unread && styles.iconUnread]}>
        <Icon size={18} color={unread ? t.accentText : t.textMuted} />
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={[styles.title, unread && styles.bold]} numberOfLines={1}>
            {conversation.title}
          </Text>
          {archived ? <Archive size={13} color={t.textSubtle} /> : null}
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.scope} numberOfLines={1}>
          {scopeText(conversation)}
          {conversation.scope !== 'DIRECT'
            ? `  ·  ${conversation.memberCount} membre${conversation.memberCount > 1 ? 's' : ''}`
            : ''}
        </Text>
        <View style={styles.line}>
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {preview}
          </Text>
          {unread ? (
            <View style={styles.count}>
              <Text style={styles.countText}>{badgeCount(conversation.unreadCount)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const TeamConversationRow = memo(TeamConversationRowBase);

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  rowUnread: { borderColor: withAlpha(t.accent, 0.45) },
  archived: { opacity: 0.75 },
  pressed: { backgroundColor: t.cardPressed },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface,
  },
  iconUnread: { backgroundColor: withAlpha(t.accent, 0.16) },
  body: { flex: 1, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  bold: { fontWeight: '800' },
  time: { fontSize: 11, color: t.textSubtle },
  scope: { fontSize: 11, color: t.textSubtle },
  preview: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  previewUnread: { color: t.text, fontWeight: '600' },
  count: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: t.danger,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
}));
