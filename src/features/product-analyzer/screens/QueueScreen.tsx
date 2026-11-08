import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Ban, Check, ChevronRight, Circle, ListChecks, PauseCircle, X } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { EmptyState } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';

import { confirmDialog } from '../bulkActions';
import { fmtClock, PipelineCard, ProgressBar } from '../components/PipelineCard';
import { useAnalysisQueue } from '../hooks/useAnalysisQueue';
import { backToHistory, openPaFiche } from '../navigation';
import type { QueueItem, QueueItemStatus } from '../socket/types';

const keyExtractor = (item: QueueItem) => item.id;

function itemStatusText(item: QueueItem): string {
  switch (item.status) {
    case 'pending':
      return 'En attente';
    case 'analyzing':
      return 'Analyse en cours…';
    case 'done':
      return `Terminé · ${fmtClock(item.elapsedMs)}`;
    case 'blocked':
      return item.errorMsg ?? 'Déjà au catalogue';
    case 'ebat_not_found':
      return 'Introuvable dans EbatPro';
    default:
      return item.errorMsg ?? 'Échec';
  }
}

function ItemIcon({ status }: { status: QueueItemStatus }) {
  const t = useTheme();
  switch (status) {
    case 'analyzing':
      return <ActivityIndicator size="small" color={t.accent} />;
    case 'done':
      return <Check size={18} color={t.success} />;
    case 'error':
      return <X size={18} color={t.danger} />;
    case 'blocked':
      return <Ban size={18} color={t.warning} />;
    case 'ebat_not_found':
      return <AlertTriangle size={18} color={t.warning} />;
    default:
      return <Circle size={14} color={t.textFaint} />;
  }
}

/** Suivi d'une file d'analyses (relance d'une sélection, réserve) : un produit à la fois. */
export function QueueScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { connection, queue, live, pipeline, counts, totalElapsed, stop, close } = useAnalysisQueue();

  const onStop = useCallback(async () => {
    const ok = await confirmDialog(
      "Arrêter la file d'analyses ?",
      'Les produits non analysés seront abandonnés (les lignes de réserve éventuelles sont rendues).',
      'Arrêter',
      true,
    );
    if (ok) stop();
  }, [stop]);

  const onClose = useCallback(() => {
    close();
    backToHistory();
  }, [close]);

  const renderItem = useCallback(
    ({ item, index }: { item: QueueItem; index: number }) => {
      const openable = !!item.stagingId && (item.status === 'done' || item.status === 'ebat_not_found');
      const current = item.status === 'analyzing';
      return (
        <Pressable
          disabled={!openable}
          onPress={() => item.stagingId && openPaFiche(item.stagingId)}
          accessibilityRole={openable ? 'button' : 'text'}
          accessibilityLabel={`${index + 1}. ${item.label || item.ref}, ${itemStatusText(item)}`}
          style={({ pressed }) => [
            styles.item,
            current && { borderColor: withAlpha(t.accent, 0.5), backgroundColor: withAlpha(t.accent, 0.06) },
            pressed && { backgroundColor: t.cardPressed },
          ]}
        >
          <View style={styles.itemIcon}>
            <ItemIcon status={item.status} />
          </View>
          <View style={styles.itemText}>
            <Text style={styles.itemLabel} numberOfLines={1}>
              {item.label || item.ref}
            </Text>
            <Text style={styles.itemRef} numberOfLines={1}>
              {item.label ? `${item.ref} · ` : ''}
              <Text
                style={
                  item.status === 'error'
                    ? { color: t.danger }
                    : item.status === 'blocked' || item.status === 'ebat_not_found'
                      ? { color: t.warning }
                      : undefined
                }
              >
                {itemStatusText(item)}
              </Text>
            </Text>
          </View>
          {openable ? <ChevronRight size={16} color={t.textFaint} /> : null}
        </Pressable>
      );
    },
    [styles, t],
  );

  if (!queue.open) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "File d'analyses" }} />
        <EmptyState
          icon={<ListChecks size={28} color={t.textFaint} />}
          title="Aucune file d'analyses"
          text="Relancez une sélection ou analysez la réserve pour suivre la file ici."
        />
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Button label="Retour à l'historique" variant="outline" onPress={backToHistory} />
        </View>
      </View>
    );
  }

  const ratio = counts.total > 0 ? counts.processed / counts.total : 0;
  const finished = !queue.running;

  const header = (
    <View style={styles.header}>
      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryTitle}>
            {finished ? 'File terminée' : "File d'analyses en cours"} · {counts.processed}/{counts.total}
          </Text>
          <Text style={styles.timer}>{fmtClock(totalElapsed)}</Text>
        </View>
        <ProgressBar ratio={ratio} tone={finished && counts.failed > 0 ? t.warning : undefined} />
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: t.success }]}>{counts.done} réussi{counts.done > 1 ? 's' : ''}</Text>
          {counts.notFound > 0 ? (
            <Text style={[styles.count, { color: t.warning }]}>{counts.notFound} introuvable{counts.notFound > 1 ? 's' : ''}</Text>
          ) : null}
          {counts.failed > 0 ? (
            <Text style={[styles.count, { color: t.danger }]}>{counts.failed} en échec</Text>
          ) : null}
        </View>
      </View>

      {!connection.connected && queue.running ? (
        <View style={[styles.banner, { borderColor: withAlpha(t.warning, 0.4), backgroundColor: withAlpha(t.warning, 0.1) }]}>
          <Text style={[styles.bannerText, { color: t.warning }]}>Reconnexion au serveur d’analyse…</Text>
        </View>
      ) : null}

      {queue.reserveReleased ? (
        <View style={[styles.banner, { borderColor: withAlpha(t.info, 0.4), backgroundColor: withAlpha(t.info, 0.1) }]}>
          <PauseCircle size={16} color={t.info} />
          <Text style={[styles.bannerText, { color: t.info }]}>
            Application en arrière-plan : les lignes de réserve ont été rendues, elles seront reprises au retour.
          </Text>
        </View>
      ) : null}

      {queue.running ? <PipelineCard live={live} pipeline={pipeline} compact /> : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: queue.source === 'reserve' ? 'Réserve en cours' : "File d'analyses" }} />
      <FlatList
        data={queue.items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, spacing.lg) + 88 }]}
        ItemSeparatorComponent={Separator}
        initialNumToRender={20}
        windowSize={9}
        removeClippedSubviews
      />
      <View style={[styles.actions, styles.floating, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {queue.running ? (
          <Button label="Arrêter la file" variant="outline" onPress={onStop} />
        ) : (
          <Button label="Terminer" onPress={onClose} />
        )}
      </View>
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.bg },
  list: { padding: spacing.xl },
  header: { gap: spacing.md, paddingBottom: spacing.lg },
  summary: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  summaryTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  timer: { fontFamily: monoFontFamily, fontSize: fontSize.sm, fontWeight: '700', color: t.textMuted },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  count: { fontSize: fontSize.xs, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  bannerText: { flexShrink: 1, fontSize: fontSize.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  itemIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: 2 },
  itemLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  itemRef: { fontSize: fontSize.xs, color: t.textMuted },
  actions: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  floating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bg,
  },
}));
