import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, MapPin, Printer } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { chooseAction } from '@/lib/actionSheet';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { CarrierTestMode, CarrierTestOption, PrintServerItem, TestableCarrier } from '@/types/hubSupervision';

import {
  PRINT_MODE_LABELS,
  STATUS_META,
  formatAgo,
  formatDuration,
  toneColor,
} from '../display';
import type { CarrierRun } from '../hooks/usePrintServerActions';
import { CarrierTests } from './CarrierTests';

type Props = {
  server: PrintServerItem;
  expanded: boolean;
  onToggleExpand: (serverId: string) => void;
  /** Étiquettes sorties aujourd'hui pour l'entrepôt ; `null` tant que les statistiques ne sont pas chargées. */
  todayLabels: number | null;
  nowMs: number;
  carrierTests?: CarrierTestOption[];
  carrierRuns: Record<string, CarrierRun>;
  carrierPending: { carrier: TestableCarrier; mode: CarrierTestMode } | null;
  carrierBusy: boolean;
  onCarrierTest: (carrier: TestableCarrier, mode: CarrierTestMode) => void;
  onToggleEnabled: (server: PrintServerItem) => void;
  toggling: boolean;
  onTestPrint: (server: PrintServerItem) => void;
  testing: boolean;
  onEditLocation: (server: PrintServerItem) => void;
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{children}</Text>
    </View>
  );
}

/**
 * Un poste d'impression : ligne compacte (statut, entrepôt, dernier signe de vie, file d'attente)
 * qui se déplie pour montrer le détail, l'adresse, les tests et les actions.
 */
export function PrintServerRow({
  server,
  expanded,
  onToggleExpand,
  todayLabels,
  nowMs,
  carrierTests,
  carrierRuns,
  carrierPending,
  carrierBusy,
  onCarrierTest,
  onToggleEnabled,
  toggling,
  onTestPrint,
  testing,
  onEditLocation,
}: Props) {
  const styles = useStyles();
  const t = useTheme();
  const meta = STATUS_META[server.status];
  const color = toneColor(t, meta.tone);
  const canTest = server.enabled && server.connected;
  const today = todayLabels === null ? '—' : todayLabels;
  const problemSummary =
    server.problems.length > 0
      ? `${server.problems[0]}${server.problems.length > 1 ? ` (+${server.problems.length - 1})` : ''}`
      : null;

  const reachable =
    server.printerReachable === null
      ? 'Non vérifiable'
      : server.printerReachable
        ? 'Joignable'
        : 'Injoignable';

  const confirmToggle = async () => {
    if (!server.enabled) {
      onToggleEnabled(server);
      return;
    }
    const choice = await chooseAction(
      `Désactiver la supervision de ${server.warehouse} ?`,
      [{ label: 'Désactiver la supervision', value: 'disable', destructive: true }],
      "Le poste n'est plus compté dans les anomalies et les tests d'impression sont bloqués.",
    );
    if (choice === 'disable') onToggleEnabled(server);
  };

  const location = server.location;

  return (
    <View
      style={[
        styles.card,
        server.enabled && server.status !== 'ONLINE' && { borderColor: withAlpha(t.danger, 0.4) },
        !server.enabled && styles.disabled,
      ]}
    >
      <Pressable
        onPress={() => onToggleExpand(server.serverId)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${server.warehouse}, ${meta.label}`}
        style={styles.header}
      >
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.headerBody}>
          <View style={styles.titleRow}>
            <Text style={styles.warehouse} numberOfLines={1}>
              {server.warehouse}
            </Text>
            <Text style={styles.city} numberOfLines={1}>
              {location ? location.city : server.name || server.hostname || 'sans adresse'}
            </Text>
          </View>
          <Text style={styles.sub} numberOfLines={2}>
            {formatAgo(server.lastSeenAt, nowMs)} · {today} auj.
            {server.pendingCount > 0 ? (
              <Text style={{ color: t.warning, fontWeight: '700' }}> · {server.pendingCount} en attente</Text>
            ) : null}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.35) }]}>
          <Text style={[styles.chipText, { color }]} numberOfLines={1}>
            {meta.label}
          </Text>
        </View>
        <ChevronDown
          size={18}
          color={t.textFaint}
          style={expanded ? styles.chevronOpen : undefined}
        />
      </Pressable>

      {!expanded && problemSummary ? (
        <Text style={[styles.problemLine, { backgroundColor: withAlpha(t.danger, 0.1), color: t.danger }]} numberOfLines={2}>
          {problemSummary}
        </Text>
      ) : null}

      {expanded ? (
        <View style={styles.body}>
          <Pressable
            onPress={() => onEditLocation(server)}
            accessibilityRole="button"
            accessibilityLabel={location ? "Modifier l'adresse du poste" : "Renseigner l'adresse du poste"}
            style={styles.locationRow}
          >
            <MapPin size={15} color={location ? t.accentText : t.textFaint} style={styles.pin} />
            {location ? (
              <View style={styles.locationBody}>
                {location.locationLabel ? (
                  <Text style={styles.locationLabel}>{location.locationLabel}</Text>
                ) : null}
                <Text style={styles.locationText}>
                  {location.addressLine}, {location.postalCode} {location.city}
                </Text>
              </View>
            ) : (
              <Text style={[styles.locationText, { color: t.accentText, fontWeight: '700' }]}>
                Ajouter une adresse
              </Text>
            )}
          </Pressable>

          {server.problems.length > 0 ? (
            <View style={[styles.problems, { backgroundColor: withAlpha(t.danger, 0.1) }]}>
              {server.problems.map((problem) => (
                <Text key={problem} style={[styles.problemText, { color: t.danger }]}>
                  {problem}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.details}>
            <DetailRow label="Dernier signe de vie">{formatAgo(server.lastSeenAt, nowMs)}</DetailRow>
            {server.status === 'OFFLINE' && server.lastDisconnectedAt ? (
              <DetailRow label="Déconnecté">{formatAgo(server.lastDisconnectedAt, nowMs)}</DetailRow>
            ) : null}
            <DetailRow label="Dernière impression">{formatAgo(server.lastPrintAt, nowMs)}</DetailRow>
            <DetailRow label="Imprimante">
              <Text
                style={{
                  color:
                    server.printerReachable === null
                      ? t.textFaint
                      : server.printerReachable
                        ? t.success
                        : t.danger,
                }}
              >
                {reachable}
              </Text>
            </DetailRow>
            <DetailRow label="Aujourd'hui">
              {todayLabels === null ? '—' : `${todayLabels} étiquette${todayLabels > 1 ? 's' : ''}`}
              {server.printErrorsToday !== null ? (
                <Text style={{ color: server.printErrorsToday > 0 ? t.danger : t.textSubtle }}>
                  {` · ${server.printErrorsToday} erreur${server.printErrorsToday > 1 ? 's' : ''} d'impression`}
                </Text>
              ) : null}
            </DetailRow>
            <DetailRow label="Étiquettes en attente">
              {server.pendingCount}
              {server.oldestPendingAgeSec !== null ? (
                <Text style={{ color: t.textSubtle }}>
                  {` (la plus ancienne : ${formatDuration(server.oldestPendingAgeSec)})`}
                </Text>
              ) : null}
            </DetailRow>
            <DetailRow label="Mode d'impression">
              {server.printMode ? (PRINT_MODE_LABELS[server.printMode] ?? server.printMode) : '—'}
              {server.printerTarget ? <Text style={{ color: t.textSubtle }}>{` ${server.printerTarget}`}</Text> : null}
            </DetailRow>
            <DetailRow label="Poste">
              {server.hostname ?? '—'}
              {server.version ? <Text style={{ color: t.textSubtle }}>{` v${server.version}`}</Text> : null}
            </DetailRow>
          </View>

          {server.lastPollError ? (
            <Text style={[styles.pollError, { backgroundColor: withAlpha(t.warning, 0.12), color: t.warning }]}>
              Dernière erreur : {server.lastPollError}
            </Text>
          ) : null}

          {carrierTests && carrierTests.length > 0 ? (
            <CarrierTests
              warehouse={server.warehouse}
              options={carrierTests}
              canPrint={canTest}
              printDisabledReason={
                server.enabled
                  ? "Poste hors ligne : impossible de tester l'impression"
                  : 'Supervision désactivée : réactivez-la pour tester'
              }
              runs={carrierRuns}
              pending={carrierPending}
              busy={carrierBusy}
              onTest={onCarrierTest}
            />
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Tester l'impression"
              variant="outline"
              leadingIcon={<Printer size={14} color={t.accentText} />}
              loading={testing}
              disabled={!canTest}
              onPress={() => onTestPrint(server)}
              style={styles.action}
            />
            <Button
              label={server.enabled ? 'Désactiver la supervision' : 'Réactiver la supervision'}
              variant="outline"
              destructive={server.enabled}
              loading={toggling}
              onPress={() => void confirmToggle()}
              style={styles.action}
            />
          </View>
          {!canTest ? (
            <Text style={styles.hint}>
              {server.enabled
                ? 'Poste hors ligne : impossible de tester.'
                : 'Supervision désactivée : réactivez-la pour tester.'}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
  },
  disabled: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  headerBody: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs + 2, flexWrap: 'wrap' },
  warehouse: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  city: { flexShrink: 1, fontSize: fontSize.xs, color: t.textMuted },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
  chip: {
    maxWidth: 130,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: '700' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  problemLine: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    fontSize: fontSize.xs,
    overflow: 'hidden',
  },
  body: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  locationRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', minHeight: 32 },
  pin: { marginTop: 2 },
  locationBody: { flex: 1, gap: 1 },
  locationLabel: { fontSize: fontSize.xs, fontWeight: '700', color: t.text },
  locationText: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  problems: { gap: 2, padding: spacing.sm, borderRadius: radius.sm },
  problemText: { fontSize: fontSize.xs, lineHeight: 16 },
  details: { gap: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  detailLabel: { fontSize: fontSize.xs, color: t.textMuted },
  detailValue: { flex: 1, textAlign: 'right', fontSize: fontSize.xs, fontWeight: '500', color: t.text },
  pollError: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    fontSize: fontSize.xs,
    overflow: 'hidden',
  },
  actions: { gap: spacing.sm },
  action: { minHeight: 40 },
  hint: { fontSize: fontSize.xs, color: t.textSubtle },
}));
