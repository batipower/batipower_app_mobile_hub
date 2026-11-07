import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ExternalLink,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react-native';

import { supportChatApi } from '@/api/supportChat';
import { Badge, Button } from '@/components/ui';
import { openOrder } from '@/features/search/navigation';
import { formatDate, formatEuro } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { AiSuggestResult, ProposedAction } from '@/types/supportChat';

import { openClientAction } from '../navigation';
import { clientActionsKey } from '../queryKeys';
import {
  dismissDraftAction,
  patchClientDraft,
  useClientDraftSelector,
} from './draftStore';
import { hapticLight } from './feedback';
import {
  ACTION_ICONS,
  RESEND_MANUAL_NOTICE,
  actionKey,
  describeActionParams,
} from './savActions';
import type { AiAssist } from './useAiAssist';

type AiProgressBarProps = { ai: AiAssist };

/** Attente de la Réponse IA ou de l'affinage : message explicite, durée écoulée, annulation. */
export function AiProgressBar({ ai }: AiProgressBarProps) {
  const styles = useStyles();
  const t = useTheme();
  if (ai.phase === 'idle') return null;

  const label =
    ai.phase === 'suggest'
      ? 'Réponse IA en cours. L’analyse de la conversation peut durer jusqu’à 90 secondes.'
      : 'Affinage en cours. Cela peut durer jusqu’à 90 secondes.';

  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="small" color={t.info} />
      <View style={styles.progressText}>
        <Text style={styles.progressLabel}>{label}</Text>
        {ai.elapsed > 0 ? <Text style={styles.progressElapsed}>{ai.elapsed} s</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Annuler la demande à l’IA"
        hitSlop={8}
        onPress={ai.cancel}
        style={styles.progressCancel}
      >
        <Text style={styles.progressCancelText}>Annuler</Text>
      </Pressable>
    </View>
  );
}

type ClientAiAssistPanelProps = {
  conversationId: string;
  ai: AiAssist;
};

/**
 * Panneau d'analyse sous le fil, une fois la Réponse IA générée : commande analysée, scénario,
 * informations manquantes et actions proposées. Aucune action n'est exécutée automatiquement :
 * « Examiner et exécuter » ouvre la feuille SAV, préremplie, pour confirmation.
 */
export function ClientAiAssistPanel({ conversationId, ai }: ClientAiAssistPanelProps) {
  const styles = useStyles();
  const t = useTheme();
  const [expanded, setExpanded] = useState(true);
  const result = useClientDraftSelector(conversationId, (d) => d.aiResult);
  const dismissed = useClientDraftSelector(conversationId, (d) => d.dismissedActions);

  const actionsQuery = useQuery({
    queryKey: clientActionsKey(conversationId),
    queryFn: ({ signal }) => supportChatApi.listActions(conversationId, signal),
    enabled: !!result,
  });

  if (!result) return null;

  const doneKeys = new Set(
    (actionsQuery.data ?? []).filter((a) => a.status === 'DONE').map((a) => `${a.type}:${a.orderReference}`),
  );
  const visibleActions = result.actions.filter((a) => !dismissed.includes(actionKey(a)));
  const hasContent =
    !!result.order ||
    visibleActions.length > 0 ||
    result.missingInfo.length > 0 ||
    result.orders.length > 0;
  if (!hasContent) return null;

  const currentOrder = result.order?.reference ?? null;

  function execute(action: ProposedAction) {
    hapticLight();
    patchClientDraft(conversationId, { actionPrefill: action });
    openClientAction(conversationId);
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Réduire l’analyse IA' : 'Afficher l’analyse IA'}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={styles.headerMain}
        >
          <Sparkles size={16} color={t.info} />
          <Text style={styles.title}>Analyse IA</Text>
          {expanded ? (
            <ChevronDown size={16} color={t.textSubtle} />
          ) : (
            <ChevronUp size={16} color={t.textSubtle} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Régénérer la réponse IA"
          accessibilityState={{ disabled: ai.busy }}
          disabled={ai.busy}
          hitSlop={4}
          onPress={() => void ai.suggest(currentOrder ?? undefined)}
          style={[styles.iconButton, ai.busy && styles.disabled]}
        >
          <RefreshCw size={18} color={t.textMuted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer l’analyse IA"
          hitSlop={4}
          onPress={() => patchClientDraft(conversationId, { aiResult: null })}
          style={styles.iconButton}
        >
          <X size={18} color={t.textMuted} />
        </Pressable>
      </View>

      {expanded ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AnalysisSummary result={result} onOpenOrder={openOrder} />

          {result.orders.length > 1 ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Commande à analyser</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.orderChips}
                keyboardShouldPersistTaps="handled"
              >
                {result.orders.map((order) => {
                  const selected = order.reference === currentOrder;
                  const date = formatDate(order.dateAdd);
                  return (
                    <Pressable
                      key={order.reference}
                      accessibilityRole="button"
                      accessibilityLabel={`Analyser la commande ${order.reference}`}
                      accessibilityState={{ selected, disabled: ai.busy }}
                      disabled={ai.busy || selected}
                      hitSlop={4}
                      onPress={() => void ai.suggest(order.reference)}
                      style={[styles.orderChip, selected && styles.orderChipSelected, ai.busy && styles.disabled]}
                    >
                      <Text style={[styles.orderChipRef, selected && { color: t.accentText }]}>
                        {order.reference}
                      </Text>
                      {date || order.totalPaid != null ? (
                        <Text style={styles.orderChipMeta}>
                          {[date, order.totalPaid != null ? formatEuro(order.totalPaid) : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {result.missingInfo.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Informations manquantes</Text>
              {result.missingInfo.map((question) => (
                <View key={question} style={styles.missingRow}>
                  <CircleHelp size={14} color={t.info} style={styles.missingIcon} />
                  <Text style={styles.missingText}>{question}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {visibleActions.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Actions proposées</Text>
              {visibleActions.map((action) => {
                const Icon = ACTION_ICONS[action.type];
                const detail = describeActionParams(action);
                const done = doneKeys.has(actionKey(action));
                return (
                  <View key={actionKey(action)} style={styles.actionCard}>
                    <View style={styles.actionHead}>
                      <Icon size={18} color={t.info} />
                      <View style={styles.actionBody}>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                        <Text style={styles.actionOrder}>Commande {action.orderReference}</Text>
                        {detail ? <Text style={styles.actionDetail}>{detail}</Text> : null}
                        {action.rationale ? (
                          <Text style={styles.actionRationale}>{action.rationale}</Text>
                        ) : null}
                        {action.warning ? (
                          <Text style={styles.actionWarning}>{action.warning}</Text>
                        ) : null}
                        {!action.executable ? (
                          <Text style={styles.actionRationale}>{RESEND_MANUAL_NOTICE}</Text>
                        ) : null}
                      </View>
                    </View>
                    {done ? (
                      <View style={styles.doneRow}>
                        <CheckCircle2 size={16} color={t.success} />
                        <Text style={[styles.doneText, { color: t.success }]}>Effectué</Text>
                      </View>
                    ) : (
                      <View style={styles.actionButtons}>
                        <Button
                          label="Ignorer"
                          variant="ghost"
                          onPress={() => dismissDraftAction(conversationId, actionKey(action))}
                          style={styles.smallButton}
                        />
                        {action.executable ? (
                          <Button
                            label="Examiner et exécuter"
                            onPress={() => execute(action)}
                            style={styles.smallButton}
                          />
                        ) : (
                          <Button
                            label="Ouvrir la commande"
                            variant="outline"
                            leadingIcon={<ExternalLink size={14} color={t.text} />}
                            onPress={() => openOrder(action.orderReference)}
                            style={styles.smallButton}
                          />
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

function AnalysisSummary({
  result,
  onOpenOrder,
}: {
  result: AiSuggestResult;
  onOpenOrder: (reference: string) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.summary}>
      {result.order ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir la commande ${result.order.reference}`}
          hitSlop={6}
          onPress={() => onOpenOrder(result.order!.reference)}
          style={styles.orderLink}
        >
          <Text style={styles.orderLinkText}>{result.order.reference}</Text>
          <ExternalLink size={12} color={t.info} />
        </Pressable>
      ) : (
        <Text style={styles.noOrder}>Aucune commande identifiée</Text>
      )}
      {result.order?.refunded ? <Badge label="Déjà remboursée" tone="amber" /> : null}
      {result.scenario ? <Badge label={result.scenario} tone="blue" /> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  panel: {
    borderTopWidth: 1,
    borderTopColor: withAlpha(t.info, 0.25),
    backgroundColor: withAlpha(t.info, 0.07),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  headerMain: {
    flex: 1,
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.info },
  iconButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  scroll: { maxHeight: 280 },
  body: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  orderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.35),
    backgroundColor: t.card,
  },
  orderLinkText: { fontSize: fontSize.xs, fontWeight: '700', color: t.info, fontFamily: monoFontFamily },
  noOrder: { fontSize: fontSize.xs, color: t.textMuted },
  block: { gap: spacing.sm },
  blockTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  orderChips: { gap: spacing.sm },
  orderChip: {
    minHeight: hitTarget - 6,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  orderChipSelected: {
    borderColor: withAlpha(t.accent, 0.6),
    backgroundColor: withAlpha(t.accent, 0.14),
  },
  orderChipRef: { fontSize: fontSize.xs, fontWeight: '700', color: t.text, fontFamily: monoFontFamily },
  orderChipMeta: { fontSize: 11, color: t.textSubtle },
  missingRow: { flexDirection: 'row', gap: spacing.sm },
  missingIcon: { marginTop: 3 },
  missingText: { flex: 1, fontSize: fontSize.xs + 1, lineHeight: 18, color: t.textMuted },
  actionCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.25),
    backgroundColor: t.card,
  },
  actionHead: { flexDirection: 'row', gap: spacing.md },
  actionBody: { flex: 1, gap: 2 },
  actionLabel: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  actionOrder: { fontSize: 11, color: t.textSubtle },
  actionDetail: { fontSize: fontSize.xs + 1, fontWeight: '600', color: t.info },
  actionRationale: { fontSize: fontSize.xs + 1, lineHeight: 17, color: t.textMuted },
  actionWarning: { fontSize: fontSize.xs + 1, lineHeight: 17, color: t.warning },
  actionButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  smallButton: { minHeight: hitTarget, paddingHorizontal: spacing.md },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-end' },
  doneText: { fontSize: fontSize.xs + 1, fontWeight: '700' },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: withAlpha(t.info, 0.25),
    backgroundColor: withAlpha(t.info, 0.07),
  },
  progressText: { flex: 1, gap: 2 },
  progressLabel: { fontSize: fontSize.xs + 1, lineHeight: 17, color: t.text },
  progressElapsed: { fontSize: 11, color: t.textSubtle },
  progressCancel: { minHeight: hitTarget, justifyContent: 'center', paddingHorizontal: spacing.xs },
  progressCancelText: { fontSize: fontSize.sm, fontWeight: '700', color: t.danger },
}));
