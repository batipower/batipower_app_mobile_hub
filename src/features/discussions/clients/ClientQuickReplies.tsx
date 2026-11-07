import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileText, Receipt, Truck, type LucideIcon } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { supportChatApi } from '@/api/supportChat';
import { Badge } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { formatDate, formatEuro } from '@/lib/format';
import {
  fontSize,
  hitTarget,
  makeStyles,
  monoFontFamily,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import {
  SUPPORT_CHAT_MAX_FILES_PER_MESSAGE,
  type CustomerOrderOption,
  type PrepareQuickReplyPayload,
  type PreparedQuickReply,
  type QuickReplyType,
} from '@/types/supportChat';

import { clientQuickRepliesKey } from '../queryKeys';
import {
  addDraftAttachments,
  appendDraftText,
  hasRoomForAttachment,
} from './draftStore';
import { hapticSuccess } from './feedback';

export const QUICK_REPLY_META: Record<
  QuickReplyType,
  { chip: string; title: string; icon: LucideIcon; hint: string }
> = {
  INVOICE: {
    chip: 'Facture',
    title: 'Envoyer une facture',
    icon: Receipt,
    hint: 'Choisissez la commande : le message et la facture en PDF seront ajoutés au brouillon.',
  },
  QUOTE: {
    chip: 'Devis',
    title: 'Envoyer un devis',
    icon: FileText,
    hint: 'Choisissez le devis en cours : le message et le PDF seront ajoutés au brouillon.',
  },
  TRACKING: {
    chip: 'Suivi colis',
    title: 'Envoyer le suivi du colis',
    icon: Truck,
    hint: 'Choisissez la commande : le message avec le lien de suivi sera ajouté au brouillon.',
  },
};

/** Commande du sujet en premier, puis l'ordre de l'API (les plus récentes d'abord). */
function sortOrders(
  orders: readonly CustomerOrderOption[],
  defaultReference: string | null,
): CustomerOrderOption[] {
  if (!defaultReference) return [...orders];
  return [...orders].sort(
    (a, b) => Number(b.reference === defaultReference) - Number(a.reference === defaultReference),
  );
}

type QuickReplySheetProps = {
  conversationId: string;
  /** Type de réponse à préparer ; `null` : feuille fermée. */
  kind: QuickReplyType | null;
  onClose: () => void;
};

/**
 * Feuille de choix d'une réponse rapide (facture, devis, suivi). Le choix prépare le message
 * modèle et le PDF éventuel dans le brouillon : rien n'est envoyé, l'opérateur relit d'abord.
 * Les erreurs s'affichent dans la feuille (un toast passerait derrière la fenêtre modale).
 */
export function QuickReplySheet({ conversationId, kind, onClose }: QuickReplySheetProps) {
  const styles = useStyles();
  const t = useTheme();
  const [error, setError] = useState<string | null>(null);
  const visible = kind !== null;
  // Garde le dernier type affiché pendant l'animation de fermeture (pas de clignotement).
  const [shown, setShown] = useState<QuickReplyType | null>(kind);
  if (kind && kind !== shown) setShown(kind);

  const options = useQuery({
    queryKey: clientQuickRepliesKey(conversationId),
    queryFn: ({ signal }) => supportChatApi.getQuickReplies(conversationId, signal),
    enabled: visible,
    staleTime: 0,
  });

  const prepare = useMutation({
    mutationFn: (payload: PrepareQuickReplyPayload) =>
      supportChatApi.prepareQuickReply(conversationId, payload),
    onSuccess: (result) => apply(result),
    onError: (e) => setError(errorMessage(e, 'Impossible de préparer la réponse rapide.')),
  });

  function close() {
    if (prepare.isPending) return;
    setError(null);
    onClose();
  }

  /** Remplit le brouillon (texte à la suite, PDF en pièce jointe) puis ferme la feuille. */
  function apply(result: PreparedQuickReply) {
    const { attachment } = result;
    if (attachment && !hasRoomForAttachment(conversationId, attachment)) {
      setError(
        `Maximum ${SUPPORT_CHAT_MAX_FILES_PER_MESSAGE} fichiers par message : retirez une pièce jointe, puis réessayez.`,
      );
      return;
    }
    appendDraftText(conversationId, result.message);
    if (attachment) addDraftAttachments(conversationId, [attachment]);
    hapticSuccess();
    setError(null);
    onClose();
    toast.success(
      attachment
        ? `Message prêt avec ${attachment.fileName} : relisez puis envoyez.`
        : 'Message prêt : relisez puis envoyez.',
    );
  }

  function run(payload: PrepareQuickReplyPayload) {
    setError(null);
    prepare.mutate(payload);
  }

  const meta = shown ? QUICK_REPLY_META[shown] : null;
  const data = options.data;
  const orders = data ? sortOrders(data.orders, data.defaultOrderReference) : [];
  const quotes = data?.quotes ?? [];
  const pending = prepare.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.side} />
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {meta?.title ?? 'Réponse rapide'}
          </Text>
          <View style={[styles.side, styles.sideEnd]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              hitSlop={10}
              onPress={close}
            >
              <Text style={[styles.close, pending && { opacity: 0.4 }]}>Fermer</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {meta ? <Text style={styles.hint}>{meta.hint}</Text> : null}

          {error ? (
            <View style={styles.error} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {options.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator color={t.accentText} />
            </View>
          ) : options.isError ? (
            <View style={styles.center}>
              <Text style={styles.empty}>
                {errorMessage(options.error, 'Impossible de charger les choix.')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Réessayer"
                onPress={() => void options.refetch()}
                style={styles.retry}
              >
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : shown === 'QUOTE' ? (
            quotes.length === 0 ? (
              <Text style={styles.empty}>Aucun devis en cours pour ce client.</Text>
            ) : (
              quotes.map((quote) => (
                <OptionRow
                  key={quote.id}
                  title={quote.quoteNumber}
                  subtitle={[
                    formatEuro(quote.totalTTC),
                    quote.validUntil ? `valable jusqu’au ${formatDate(quote.validUntil)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  disabled={pending}
                  loading={pending && prepare.variables?.quoteId === quote.id}
                  onPress={() => run({ type: 'QUOTE', quoteId: quote.id })}
                />
              ))
            )
          ) : orders.length === 0 ? (
            <Text style={styles.empty}>Aucune commande pour ce client.</Text>
          ) : (
            orders.map((order) => (
              <OptionRow
                key={order.reference}
                title={order.reference}
                mono
                subtitle={[
                  formatDate(order.dateAdd),
                  order.totalPaid != null ? formatEuro(order.totalPaid) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                badge={order.reference === data?.defaultOrderReference ? 'Sujet de la conversation' : undefined}
                disabled={pending}
                loading={pending && prepare.variables?.orderReference === order.reference}
                onPress={() => run({ type: shown ?? 'INVOICE', orderReference: order.reference })}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

type OptionRowProps = {
  title: string;
  subtitle: string;
  mono?: boolean;
  badge?: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
};

function OptionRow({ title, subtitle, mono, badge, disabled, loading, onPress }: OptionRowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, badge].filter(Boolean).join(', ')}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        pressed && { backgroundColor: t.cardPressed },
        disabled && !loading && { opacity: 0.5 },
      ]}
    >
      <View style={styles.optionBody}>
        <Text style={[styles.optionTitle, mono && { fontFamily: monoFontFamily }]}>{title}</Text>
        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
        {badge ? <Badge label={badge} tone="green" /> : null}
      </View>
      {loading ? <ActivityIndicator color={t.accentText} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bgElevated },
  header: {
    minHeight: hitTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  side: { width: 72 },
  sideEnd: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  close: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  content: { gap: spacing.md, padding: spacing.xl, paddingBottom: spacing['4xl'] },
  hint: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  error: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.danger, 0.3),
    backgroundColor: t.dangerBg,
  },
  errorText: { fontSize: fontSize.sm, lineHeight: 19, color: t.danger },
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing['3xl'] },
  empty: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted, textAlign: 'center' },
  retry: {
    minHeight: hitTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryText: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  option: {
    minHeight: hitTarget + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  optionBody: { flex: 1, gap: 4 },
  optionTitle: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  optionSubtitle: { fontSize: fontSize.sm, color: t.textMuted },
}));
