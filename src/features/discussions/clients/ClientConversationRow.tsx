import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FileText, MessageSquare, Package, ShoppingCart, type LucideIcon } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { fontSize, makeStyles, radius, shadow, spacing, useTheme, withAlpha } from '@/theme';
import type { SupportConversation, SupportConversationSubjectType } from '@/types/supportChat';

import { formatLastMessageAt } from '../shared/format';

const SUBJECT_META: Record<SupportConversationSubjectType, { label: string; icon: LucideIcon }> = {
  GENERAL: { label: 'Libre', icon: MessageSquare },
  ORDER: { label: 'Commande', icon: ShoppingCart },
  QUOTE: { label: 'Devis', icon: FileText },
  PRODUCT: { label: 'Produit', icon: Package },
};

/** Libellé du sujet : celui de la conversation (« Commande 12345 »), sinon le type seul. */
export function clientSubjectLabel(conversation: SupportConversation): string {
  const meta = SUBJECT_META[conversation.subjectType] ?? SUBJECT_META.GENERAL;
  if (conversation.subjectType === 'GENERAL' || !SUBJECT_META[conversation.subjectType]) {
    return meta.label;
  }
  return conversation.subjectLabel || meta.label;
}

type ClientConversationRowProps = {
  conversation: SupportConversation;
  onPress: (conversation: SupportConversation) => void;
  onLongPress: (conversation: SupportConversation) => void;
};

/** Conversation client dans la liste : nom, sujet, dernier message, statut et pastille de non-lu. */
function ClientConversationRowBase({ conversation, onPress, onLongPress }: ClientConversationRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const meta = SUBJECT_META[conversation.subjectType] ?? SUBJECT_META.GENERAL;
  const Icon = meta.icon;
  const unread = !!conversation.unread;
  const closed = conversation.status === 'CLOSED';
  const last = conversation.lastMessage;
  const preview = last
    ? `${last.sender === 'STAFF' ? 'Vous : ' : ''}${last.content}`
    : 'Aucun message';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        conversation.customerName,
        clientSubjectLabel(conversation),
        unread ? 'non lu' : null,
        closed ? 'fermée' : null,
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
        closed && styles.closed,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, unread && styles.iconUnread]}>
        <Icon size={18} color={unread ? t.accentText : t.textMuted} />
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={[styles.title, unread && styles.bold]} numberOfLines={1}>
            {conversation.customerName || conversation.customerEmail}
          </Text>
          <Text style={styles.time}>{formatLastMessageAt(conversation.lastMessageAt)}</Text>
        </View>
        <View style={styles.badges}>
          <Badge label={clientSubjectLabel(conversation)} tone="blue" />
          {closed ? <Badge label="Fermée" tone="neutral" /> : null}
        </View>
        <View style={styles.line}>
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={2}>
            {preview}
          </Text>
          {unread ? <View style={styles.dot} accessibilityLabel="Non lu" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export const ClientConversationRow = memo(ClientConversationRowBase);

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
  closed: { opacity: 0.75 },
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
  body: { flex: 1, gap: spacing.xs + 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  bold: { fontWeight: '800' },
  time: { fontSize: 11, color: t.textSubtle },
  badges: { flexDirection: 'row', gap: spacing.xs + 2, flexWrap: 'wrap' },
  preview: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  previewUnread: { color: t.text, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.danger },
}));
