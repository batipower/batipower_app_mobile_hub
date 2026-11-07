import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FileText, Image as ImageIcon } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { supportChatApi } from '@/api/supportChat';
import { errorMessage } from '@/features/preparation/components/ListState';
import { formatFileSize } from '@/lib/pickAttachment';
import { openLocalFile } from '@/lib/openAttachment';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { SupportAttachment, SupportMessage } from '@/types/supportChat';

import { hapticError } from './feedback';
import { LinkifiedText } from './LinkifiedText';

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

type AttachmentChipProps = {
  attachment: SupportAttachment;
  conversationId: string;
};

/** Pièce jointe : téléchargée (Bearer) puis ouverte à l'appui ; non cliquable une fois expirée. */
function AttachmentChip({ attachment, conversationId }: AttachmentChipProps) {
  const styles = useStyles();
  const t = useTheme();
  const [loading, setLoading] = useState(false);
  const Icon = attachment.mimeType.startsWith('image/') ? ImageIcon : FileText;
  const size = formatFileSize(attachment.fileSize);

  async function open() {
    if (loading) return;
    setLoading(true);
    try {
      const file = await supportChatApi.downloadAttachment(
        conversationId,
        attachment.id,
        attachment.fileName,
      );
      await openLocalFile(file, attachment.fileName);
    } catch (error) {
      hapticError();
      toast.error(errorMessage(error, 'Impossible de télécharger la pièce jointe.'));
    } finally {
      setLoading(false);
    }
  }

  if (attachment.expired) {
    return (
      <View
        style={[styles.attachment, styles.attachmentExpired]}
        accessibilityLabel={`${attachment.fileName}, pièce jointe expirée`}
      >
        <Icon size={16} color={t.textFaint} />
        <Text style={[styles.attachmentName, { color: t.textSubtle }]} numberOfLines={1}>
          {attachment.fileName}
        </Text>
        <Text style={styles.attachmentMeta}>expirée</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la pièce jointe ${attachment.fileName}${size ? `, ${size}` : ''}`}
      accessibilityState={{ busy: loading }}
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={() => void open()}
      style={({ pressed }) => [styles.attachment, pressed && { backgroundColor: t.surfaceStrong }]}
    >
      {loading ? <ActivityIndicator size="small" color={t.accentText} /> : <Icon size={16} color={t.accentText} />}
      <Text style={styles.attachmentName} numberOfLines={1}>
        {attachment.fileName}
      </Text>
      {size ? <Text style={styles.attachmentMeta}>{size}</Text> : null}
    </Pressable>
  );
}

type ClientMessageBubbleProps = {
  message: SupportMessage;
  showAuthor: boolean;
};

/** Bulle du fil client : message du client à gauche, réponse de l'équipe à droite. */
function ClientMessageBubbleBase({ message, showAuthor }: ClientMessageBubbleProps) {
  const styles = useStyles();
  const isCustomer = message.sender === 'CUSTOMER';
  const attachments = message.attachments ?? [];
  const time = formatMessageTime(message.createdAt);

  return (
    <View style={[styles.row, isCustomer ? styles.rowStart : styles.rowEnd]}>
      <View style={[styles.column, isCustomer ? styles.columnStart : styles.columnEnd]}>
        {showAuthor ? (
          <Text style={styles.author} numberOfLines={1}>
            {message.authorName || (isCustomer ? 'Client' : 'Équipe')}
          </Text>
        ) : null}
        <View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleStaff]}>
          {message.content ? (
            <LinkifiedText text={message.content} style={styles.content} linkStyle={styles.link} />
          ) : null}
          {attachments.length > 0 ? (
            <View style={styles.attachments}>
              {attachments.map((attachment) => (
                <AttachmentChip
                  key={attachment.id}
                  attachment={attachment}
                  conversationId={message.conversationId}
                />
              ))}
            </View>
          ) : null}
        </View>
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
    </View>
  );
}

export const ClientMessageBubble = memo(ClientMessageBubbleBase);

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', paddingVertical: 2 },
  rowStart: { justifyContent: 'flex-start' },
  rowEnd: { justifyContent: 'flex-end' },
  column: { maxWidth: '82%', gap: 2 },
  columnStart: { alignItems: 'flex-start' },
  columnEnd: { alignItems: 'flex-end' },
  author: {
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: t.textSubtle,
  },
  bubble: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl + 4,
    borderWidth: 1,
  },
  bubbleCustomer: {
    borderBottomLeftRadius: radius.sm,
    backgroundColor: t.card,
    borderColor: t.border,
  },
  bubbleStaff: {
    borderBottomRightRadius: radius.sm,
    backgroundColor: withAlpha(t.accent, 0.2),
    borderColor: withAlpha(t.accent, 0.45),
  },
  content: { fontSize: fontSize.sm + 1, lineHeight: 21, color: t.text },
  link: { color: t.accentText, textDecorationLine: 'underline' },
  attachments: { gap: spacing.xs },
  attachment: {
    minHeight: hitTarget - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  attachmentExpired: { borderStyle: 'dashed', opacity: 0.7 },
  attachmentName: { flexShrink: 1, fontSize: fontSize.xs + 1, fontWeight: '600', color: t.text },
  attachmentMeta: { fontSize: 11, color: t.textSubtle },
  time: { paddingHorizontal: spacing.xs, fontSize: 11, color: t.textSubtle },
}));
