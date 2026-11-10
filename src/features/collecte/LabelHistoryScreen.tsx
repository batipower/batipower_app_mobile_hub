import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react-native';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Badge, Button } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { OrderLabel } from '@/types/hubCollecte';

import {
  collecteWarehouseLabel,
  formatShortDateTime,
  isCollectedState,
  labelCollectState,
  PRINT_STATUS_LABEL,
  STATE_BADGE,
  summarizeLabels,
  type CarrierCheckEntry,
  type LabelsSummary,
} from './display';
import { useCollecteActions } from './hooks/useCollecteActions';
import { useLabelsCarrierCheck } from './hooks/useLabelsCarrierCheck';
import { useOrderLabelsStatus } from './hooks/useOrderLabelsStatus';

/**
 * Historique des étiquettes d'une commande (feuille native) : impression et pointage de chaque
 * étiquette, contrôle transporteur étiquette par étiquette, et synthèse pour décider de
 * collecter ou livrer la commande.
 */
export function LabelHistoryScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  if (!reference) return null;
  return <LabelHistory reference={reference} />;
}

type BannerTone = 'green' | 'amber' | 'red' | 'gray';

function summaryView(summary: LabelsSummary): { tone: BannerTone; icon: LucideIcon; text: string } {
  const plural = summary.collected > 1;
  switch (summary.kind) {
    case 'EMPTY':
      return { tone: 'gray', icon: CircleDashed, text: 'Aucune étiquette trouvée pour cette commande.' };
    case 'CURRENT_COLLECTED':
      return { tone: 'green', icon: CircleCheck, text: "L'étiquette actuelle a bien été collectée." };
    case 'VIA_HISTORY':
      return {
        tone: 'amber',
        icon: CircleAlert,
        text: `L'étiquette actuelle n'est pas collectée, mais ${summary.collected} étiquette${plural ? 's' : ''} de l'historique ${plural ? 'sont' : 'est'} collectée${plural ? 's' : ''} : le colis est probablement parti sous une ancienne étiquette.`,
      };
    case 'CHECKING':
      return {
        tone: 'gray',
        icon: CircleDashed,
        text: `Contrôle auprès du transporteur en cours (${summary.checked}/${summary.total})…`,
      };
    case 'UNKNOWN':
      return {
        tone: 'amber',
        icon: CircleHelp,
        text: "Aucune collecte constatée par pointage, et le transporteur n'a pas pu être interrogé pour toutes les étiquettes : l'état réel est incertain.",
      };
    default:
      return {
        tone: 'red',
        icon: CircleAlert,
        text: `Aucune des ${summary.total} étiquette${summary.total > 1 ? 's' : ''} n'est collectée, ni par pointage ni selon le transporteur.`,
      };
  }
}

function LabelHistory({ reference }: { reference: string }) {
  const styles = useStyles();
  const query = useOrderLabelsStatus(reference);
  const data = query.data;
  const labels = data?.labels ?? [];
  const actions = useCollecteActions();

  // Contrôle transporteur : seulement les étiquettes de la commande ouverte, une à la fois.
  const { entries } = useLabelsCarrierCheck(
    data ? reference : null,
    labels.map((label) => label.trackingNumber),
  );
  const summary = summarizeLabels(labels, entries);
  const stillShipped = (data?.paymentStatus ?? '').includes('Expédié');
  const pending = actions.pendingFor(reference);

  const context = [
    `Commande ${reference}`,
    data?.warehouse ? collecteWarehouseLabel(data.warehouse) : null,
    data?.dateExpedie ? `expédiée le ${formatShortDateTime(data.dateExpedie)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SheetScreen title="Historique des étiquettes" closeLabel="Fermer">
      <Text style={styles.context}>{context}</Text>

      {query.isPending ? <ListSkeleton rows={2} height={120} /> : null}
      {query.isError ? (
        <ErrorBanner
          error={query.error}
          fallback="Impossible de charger l'historique"
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {data ? (
        <>
          <SummaryBanner summary={summary} />
          {labels.length > 0 ? (
            <View style={styles.list}>
              {labels.map((label) => (
                <LabelRow key={label.trackingNumber} label={label} entry={entries[label.trackingNumber]} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<CircleDashed size={24} />}
              title="Aucune étiquette"
              text="Aucune étiquette n'a été imprimée pour cette commande."
            />
          )}

          {summary.carrierEvidence && stillShipped ? (
            <View style={styles.carrierBox}>
              <Text style={styles.carrierText}>
                Le transporteur indique que le colis est parti alors que la commande est encore
                « Expédié ».
              </Text>
              <View style={styles.carrierActions}>
                <Button
                  label="Collecter"
                  loading={pending === 'collect'}
                  disabled={actions.isPending}
                  onPress={() =>
                    actions.request({ kind: 'collect', reference, totalColis: 1 }, () => router.back())
                  }
                  style={styles.carrierButton}
                />
                <Button
                  label="Livrer"
                  variant="secondary"
                  loading={pending === 'deliver'}
                  disabled={actions.isPending}
                  onPress={() =>
                    actions.request({ kind: 'deliver', reference, totalColis: 1 }, () => router.back())
                  }
                  style={styles.carrierButton}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </SheetScreen>
  );
}

function SummaryBanner({ summary }: { summary: LabelsSummary }) {
  const styles = useStyles();
  const t = useTheme();
  const view = summaryView(summary);
  const color = { green: t.success, amber: t.warning, red: t.danger, gray: t.textMuted }[view.tone];
  const Icon = view.icon;
  return (
    <View
      style={[
        styles.banner,
        { borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.1) },
      ]}
      accessibilityRole="summary"
    >
      {summary.kind === 'CHECKING' ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Icon size={16} color={color} />
      )}
      <Text style={[styles.bannerText, { color: t.text }]}>{view.text}</Text>
    </View>
  );
}

function LabelRow({ label, entry }: { label: OrderLabel; entry: CarrierCheckEntry | undefined }) {
  const styles = useStyles();
  const t = useTheme();
  const state = labelCollectState(label, entry);
  const badge = STATE_BADGE[state];
  const collected = isCollectedState(state);

  return (
    <View
      style={[
        styles.row,
        collected && { borderColor: withAlpha(t.success, 0.4), backgroundColor: withAlpha(t.success, 0.08) },
      ]}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.tracking} numberOfLines={1} selectable>
          {label.trackingNumber}
        </Text>
        <Badge label={label.isCurrent ? 'Actuelle' : 'Remplacée'} tone={label.isCurrent ? 'blue' : 'neutral'} />
      </View>
      <Badge label={badge.text} tone={badge.tone} style={styles.stateBadge} />
      <View style={styles.facts}>
        <Fact label="Transporteur" value={label.carrier ?? '—'} />
        <Fact
          label="Impression"
          value={`${formatShortDateTime(label.printedAt)}${label.printCount > 1 ? ` (${label.printCount} fois)` : ''}`}
        />
        <Fact label="Statut" value={PRINT_STATUS_LABEL[label.printStatus]} />
        <Fact label="Collecte" value={collectDetail(label, entry)} />
      </View>
    </View>
  );
}

function collectDetail(label: OrderLabel, entry: CarrierCheckEntry | undefined): string {
  if (label.collected) {
    const parts = [
      formatShortDateTime(label.collectedAt),
      label.scanWarehouse ? collecteWarehouseLabel(label.scanWarehouse) : null,
      label.collectedBy === 'ORDER_REF' ? 'via la référence de la commande' : null,
    ];
    return parts.filter(Boolean).join(' · ');
  }
  if (entry?.status === 'done' && (entry.check.lastStatus || entry.check.lastEventAt)) {
    return [
      entry.check.carrier ? `${entry.check.carrier} : ${entry.check.lastStatus ?? '—'}` : (entry.check.lastStatus ?? '—'),
      entry.check.lastEventAt,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return '—';
}

function Fact({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  context: { fontSize: fontSize.xs, color: t.textSubtle },
  list: { gap: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17 },
  row: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tracking: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
  },
  stateBadge: { alignSelf: 'flex-start' },
  facts: { gap: spacing.xs },
  fact: { flexDirection: 'row', gap: spacing.md },
  factLabel: { width: 92, fontSize: fontSize.xs, color: t.textSubtle },
  factValue: { flex: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.text },
  carrierBox: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surfaceStrong,
  },
  carrierText: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  carrierActions: { flexDirection: 'row', gap: spacing.sm },
  carrierButton: { flex: 1 },
}));
