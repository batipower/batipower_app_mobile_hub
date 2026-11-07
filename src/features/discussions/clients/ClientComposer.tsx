import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUp, FileText, Paperclip, Sparkles, WandSparkles, X } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { supportChatApi } from '@/api/supportChat';
import { errorMessage } from '@/features/preparation/components/ListState';
import { CLIENT_ATTACHMENT_RULES, formatFileSize, pickAttachment } from '@/lib/pickAttachment';
import {
  fontSize,
  hitTarget,
  makeStyles,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import {
  SUPPORT_CHAT_MAX_FILES_PER_MESSAGE,
  type QuickReplyType,
  type SupportAttachment,
} from '@/types/supportChat';

import { ClientAiRefine } from './ClientAiRefine';
import { QUICK_REPLY_META, QuickReplySheet } from './ClientQuickReplies';
import {
  CLIENT_MESSAGE_MAX_LENGTH,
  addDraftAttachments,
  removeDraftAttachment,
  setDraftText,
  useClientDraft,
} from './draftStore';
import { hapticError, hapticLight } from './feedback';
import { useSendClientMessage } from './useClientThread';
import type { AiAssist } from './useAiAssist';

const QUICK_REPLY_ORDER: readonly QuickReplyType[] = ['INVOICE', 'QUOTE', 'TRACKING'];
/** À partir de ce nombre de caractères, le compteur s'affiche. */
const COUNTER_THRESHOLD = 3500;

type ClientComposerProps = {
  conversationId: string;
  /** La conversation est fermée : l'envoi la rouvre (comportement du back). */
  closed: boolean;
  ai: AiAssist;
  /** Appelé après un envoi réussi (ex. pour revenir en bas du fil). */
  onSent?: () => void;
};

/**
 * Zone de saisie du flux Clients : texte (4000 caractères), pièces jointes (PDF et images,
 * 3 fichiers, conservées 30 jours), réponses rapides, Réponse IA et affinage. Le brouillon vit
 * dans `draftStore` : il survit à l'ouverture de la feuille d'actions SAV.
 */
export function ClientComposer({ conversationId, closed, ai, onSent }: ClientComposerProps) {
  const styles = useStyles();
  const t = useTheme();
  const draft = useClientDraft(conversationId);
  const [uploading, setUploading] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [quickKind, setQuickKind] = useState<QuickReplyType | null>(null);
  const send = useSendClientMessage(conversationId, onSent);

  const hasText = draft.text.trim().length > 0;
  const hasAttachments = draft.attachments.length > 0;
  const sending = send.isPending;
  const locked = sending || ai.busy;
  const canSend = !locked && !uploading && (hasText || hasAttachments);
  const canRefine = hasText || draft.textBeforeRefine != null;
  const showRefine = refineOpen && canRefine;

  async function attach() {
    const remaining = SUPPORT_CHAT_MAX_FILES_PER_MESSAGE - draft.attachments.length;
    if (remaining <= 0) {
      hapticError();
      toast.error(`${SUPPORT_CHAT_MAX_FILES_PER_MESSAGE} fichiers au maximum par message.`);
      return;
    }
    const files = await pickAttachment(CLIENT_ATTACHMENT_RULES, remaining);
    if (files.length === 0) return;

    setUploading(true);
    const uploaded: SupportAttachment[] = [];
    for (const file of files) {
      try {
        uploaded.push(await supportChatApi.uploadAttachment(conversationId, file));
      } catch (error) {
        hapticError();
        toast.error(`${file.name} : ${errorMessage(error, 'envoi impossible.')}`);
      }
    }
    setUploading(false);
    if (uploaded.length > 0) {
      hapticLight();
      addDraftAttachments(conversationId, uploaded);
    }
  }

  function submit() {
    if (!canSend) return;
    send.mutate({
      content: draft.text.trim(),
      fileIds: draft.attachments.map((a) => a.id),
    });
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
      >
        {QUICK_REPLY_ORDER.map((kind) => {
          const meta = QUICK_REPLY_META[kind];
          const Icon = meta.icon;
          return (
            <ComposerChip
              key={kind}
              label={meta.chip}
              accessibilityLabel={`Réponse rapide : ${meta.title}`}
              icon={<Icon size={15} color={t.textMuted} />}
              disabled={locked || uploading}
              onPress={() => setQuickKind(kind)}
            />
          );
        })}
        <ComposerChip
          label="Réponse IA"
          accessibilityLabel="Générer une réponse avec l’IA"
          tone="info"
          icon={
            ai.phase === 'suggest' ? (
              <ActivityIndicator size="small" color={t.info} />
            ) : (
              <Sparkles size={15} color={t.info} />
            )
          }
          disabled={sending || ai.busy || uploading}
          onPress={() => void ai.suggest(draft.orderReference ?? undefined)}
        />
        {canRefine ? (
          <ComposerChip
            label="Affiner"
            accessibilityLabel={showRefine ? 'Masquer l’affinage' : 'Affiner le brouillon avec l’IA'}
            tone="info"
            active={showRefine}
            icon={<WandSparkles size={15} color={t.info} />}
            onPress={() => setRefineOpen((open) => !open)}
          />
        ) : null}
      </ScrollView>

      {showRefine ? (
        <View style={styles.refine}>
          <ClientAiRefine
            refining={ai.phase === 'refine'}
            disabled={sending || ai.phase === 'suggest'}
            canUndo={draft.textBeforeRefine != null}
            onRefine={ai.refine}
            onUndo={ai.undoRefine}
          />
        </View>
      ) : null}

      {hasAttachments || uploading ? (
        <View style={styles.attachments}>
          {draft.attachments.map((attachment) => (
            <View key={attachment.id} style={styles.attachment}>
              <FileText size={14} color={t.textMuted} />
              <Text style={styles.attachmentName} numberOfLines={1}>
                {attachment.fileName}
              </Text>
              <Text style={styles.attachmentSize}>{formatFileSize(attachment.fileSize)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${attachment.fileName}`}
                accessibilityState={{ disabled: locked }}
                disabled={locked}
                hitSlop={8}
                onPress={() => removeDraftAttachment(conversationId, attachment.id)}
                style={styles.attachmentRemove}
              >
                <X size={14} color={t.textMuted} />
              </Pressable>
            </View>
          ))}
          {uploading ? (
            <View style={styles.attachment} accessibilityRole="progressbar">
              <ActivityIndicator size="small" color={t.accentText} />
              <Text style={styles.attachmentName}>Envoi du fichier…</Text>
            </View>
          ) : null}
          <Text style={styles.retention}>Conservées 30 jours</Text>
        </View>
      ) : null}

      {closed ? (
        <Text style={styles.closedNote}>
          Conversation fermée : envoyer un message la rouvrira automatiquement.
        </Text>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Joindre un fichier"
          accessibilityHint="PDF ou image, 10 Mo au maximum, conservé 30 jours"
          accessibilityState={{
            disabled:
              locked || uploading || draft.attachments.length >= SUPPORT_CHAT_MAX_FILES_PER_MESSAGE,
          }}
          disabled={
            locked || uploading || draft.attachments.length >= SUPPORT_CHAT_MAX_FILES_PER_MESSAGE
          }
          onPress={() => void attach()}
          style={[
            styles.roundButton,
            (locked ||
              uploading ||
              draft.attachments.length >= SUPPORT_CHAT_MAX_FILES_PER_MESSAGE) &&
              styles.disabled,
          ]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={t.textMuted} />
          ) : (
            <Paperclip size={20} color={t.textMuted} />
          )}
        </Pressable>

        <TextInput
          value={draft.text}
          onChangeText={(text) => setDraftText(conversationId, text)}
          editable={!locked}
          multiline
          maxLength={CLIENT_MESSAGE_MAX_LENGTH}
          placeholder="Écrivez votre réponse…"
          placeholderTextColor={t.textFaint}
          selectionColor={t.accentText}
          keyboardAppearance={t.scheme}
          textAlignVertical="top"
          accessibilityLabel="Réponse au client"
          style={styles.input}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          accessibilityState={{ disabled: !canSend, busy: sending }}
          disabled={!canSend}
          onPress={submit}
          style={[styles.sendButton, !canSend && styles.disabled]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={t.onAccent} />
          ) : (
            <ArrowUp size={20} color={t.onAccent} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>

      {draft.text.length >= COUNTER_THRESHOLD ? (
        <Text style={styles.counter}>
          {draft.text.length} / {CLIENT_MESSAGE_MAX_LENGTH}
        </Text>
      ) : null}

      <QuickReplySheet
        conversationId={conversationId}
        kind={quickKind}
        onClose={() => setQuickKind(null)}
      />
    </SafeAreaView>
  );
}

type ComposerChipProps = {
  label: string;
  accessibilityLabel: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'info';
  active?: boolean;
};

function ComposerChip({
  label,
  accessibilityLabel,
  icon,
  onPress,
  disabled = false,
  tone = 'neutral',
  active = false,
}: ComposerChipProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      hitSlop={{ top: 5, bottom: 5 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        tone === 'info' && styles.chipInfo,
        active && styles.chipActive,
        pressed && styles.chipPressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      <Text style={[styles.chipText, tone === 'info' && styles.chipTextInfo]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bgElevated,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  chipInfo: {
    borderColor: withAlpha(t.info, 0.35),
    backgroundColor: withAlpha(t.info, 0.1),
  },
  chipActive: { backgroundColor: withAlpha(t.info, 0.22) },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: fontSize.xs + 1, fontWeight: '700', color: t.textMuted },
  chipTextInfo: { color: t.info },
  disabled: { opacity: 0.45 },
  refine: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  attachment: {
    maxWidth: 260,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  attachmentName: { flexShrink: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.text },
  attachmentSize: { fontSize: 11, color: t.textSubtle },
  attachmentRemove: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retention: { fontSize: 11, color: t.textSubtle },
  closedNote: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    fontSize: fontSize.xs,
    lineHeight: 16,
    color: t.warning,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  roundButton: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: hitTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: hitTarget,
    maxHeight: 140,
    paddingHorizontal: spacing.md + 2,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: radius.xl + 4,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    color: t.text,
    fontSize: fontSize.sm + 1,
    lineHeight: 20,
  },
  sendButton: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: hitTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
  },
  counter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    fontSize: 11,
    textAlign: 'right',
    color: t.textSubtle,
  },
}));
