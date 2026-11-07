import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import {
  MarginToggle,
  Panel,
  StatGrid,
  StatTile,
} from '@/features/cockpit/components/CockpitPrimitives';
import { SegmentedControl, type Segment } from '@/features/preparation/components/SegmentedControl';
import { formatEuroWhole, formatInteger, formatPercent, formatRelative } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type {
  FinanceAnomaly,
  FinancePnlMonthResponse,
  FinancePnlSnapshotsResponse,
  TeogestEnvironment,
} from '@/types/hubFinance';

import { DataState, EmptyNote } from '../DataState';
import { HubDashboardScreen } from '../HubDashboardScreen';
import { useFinanceAnomalies, useFinanceSnapshots } from '../hooks';
import { MonthDetailSheet } from './MonthDetailSheet';
import {
  PNL_STATUS_LABELS,
  SHORT_MONTHS,
  computeTotals,
  formatSignedEuros,
  marginRatePct,
  monthStatus,
  openAnomalies,
  revenueLine,
  type PnlMonthStatus,
} from './pnl';

/** La production est toujours la société lue ; la société de test se choisit sur le web. */
const ENVIRONMENT: TeogestEnvironment = 'prod';

const euros = (cents: number) => formatEuroWhole(cents / 100);

/**
 * Vue « Financier » de l'accueil HUB (SUPERADMIN), en lecture seule : nos estimations contre la
 * comptabilité Teogest, mois par mois, d'après les derniers calculs enregistrés. Le recalcul
 * d'un mois (relecture de Teogest, 10 à 25 s) et les charges attendues restent sur le web.
 * Les montants sont masqués derrière la bascule « Marge » : un tiers peut voir l'écran.
 */
export function FinanceDashboardScreen() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [showAmounts, setShowAmounts] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const snapshotsQuery = useFinanceSnapshots(year, ENVIRONMENT);
  const snapshots = snapshotsQuery.data ?? null;
  const effectiveYear = year ?? snapshots?.year;
  const environment = snapshots?.environments.find((item) => item.id === ENVIRONMENT);
  const configured = environment ? environment.configured : true;
  const anomaliesQuery = useFinanceAnomalies(year, ENVIRONMENT, !!snapshots && configured);

  const lastComputed = useMemo(() => {
    const dates = (snapshots?.snapshots ?? []).map((item) => item.computedAt);
    return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
  }, [snapshots]);
  const updated = formatRelative(lastComputed);

  const anomalies = useMemo(
    () => openAnomalies(anomaliesQuery.data?.anomalies ?? []),
    [anomaliesQuery.data],
  );

  const selected = snapshots?.snapshots.find((item) => item.month === selectedMonth) ?? null;
  const selectedMeta = snapshots?.months.find((item) => item.month === selectedMonth) ?? null;

  return (
    <HubDashboardScreen
      view="financier"
      subtitle={updated ? `Dernier calcul ${updated} · lecture seule` : 'Lecture seule'}
    >
      {snapshots && snapshots.years.length > 1 ? (
        <YearPicker years={snapshots.years} value={effectiveYear} onChange={setYear} />
      ) : null}

      <DataState
        loading={snapshotsQuery.isPending}
        hasData={!!snapshots}
        error={snapshotsQuery.error}
        fallback="Impossible de charger le dashboard financier"
        onRetry={() => void snapshotsQuery.refetch()}
        skeletonHeight={260}
      >
        {snapshots && !configured ? (
          <Panel title="Teogest">
            <EmptyNote>
              {`La société Teogest « ${environment?.label ?? ENVIRONMENT} » n'est pas configurée sur le serveur.`}
            </EmptyNote>
          </Panel>
        ) : snapshots ? (
          <>
            <SummaryPanel
              snapshots={snapshots}
              anomalyCount={anomaliesQuery.data ? anomalies.length : null}
              highAnomalyCount={anomalies.filter((item) => item.severity === 'high').length}
              showAmounts={showAmounts}
              onToggle={() => setShowAmounts((value) => !value)}
            />
            <MonthsPanel
              snapshots={snapshots}
              showAmounts={showAmounts}
              onSelect={setSelectedMonth}
            />
            <AnomaliesPanel
              anomalies={anomalies}
              loading={anomaliesQuery.isPending}
              error={anomaliesQuery.error}
              notComputed={anomaliesQuery.data?.notComputedMonths ?? []}
              showAmounts={showAmounts}
              onRetry={() => void anomaliesQuery.refetch()}
              onSelectMonth={setSelectedMonth}
            />
          </>
        ) : null}
      </DataState>

      <MonthDetailSheet
        visible={selectedMonth !== null}
        year={effectiveYear}
        monthLabel={
          selectedMeta?.label ?? (selectedMonth ? (SHORT_MONTHS[selectedMonth - 1] ?? '') : '')
        }
        data={selected}
        showAmounts={showAmounts}
        onClose={() => setSelectedMonth(null)}
      />
    </HubDashboardScreen>
  );
}

function YearPicker({
  years,
  value,
  onChange,
}: {
  years: number[];
  value: number | undefined;
  onChange: (year: number) => void;
}) {
  const sorted = useMemo(() => [...years].sort((a, b) => a - b).slice(-4), [years]);
  const segments: Segment<string>[] = sorted.map((item) => ({
    key: String(item),
    label: String(item),
  }));
  return (
    <SegmentedControl
      segments={segments}
      value={String(value ?? sorted[sorted.length - 1])}
      onChange={(key) => onChange(Number(key))}
    />
  );
}

/** Montant masqué tant que la bascule n'est pas activée. */
const MASK = '•••• €';

function SummaryPanel({
  snapshots,
  anomalyCount,
  highAnomalyCount,
  showAmounts,
  onToggle,
}: {
  snapshots: FinancePnlSnapshotsResponse;
  anomalyCount: number | null;
  highAnomalyCount: number;
  showAmounts: boolean;
  onToggle: () => void;
}) {
  const totals = computeTotals(snapshots.snapshots, snapshots.months.length);
  const show = (cents: number) => (showAmounts ? euros(cents) : MASK);
  const revenueGap = totals.revenueAccountingCents - totals.revenueForecastCents;
  const marginRate = marginRatePct(totals.marginAccountingCents, totals.revenueAccountingCents);

  return (
    <Panel
      title={`Exercice ${snapshots.year}`}
      trailing={<MarginToggle visible={showAmounts} onToggle={onToggle} />}
    >
      {totals.loadedMonths === 0 ? (
        <EmptyNote>
          Aucun mois n&apos;a encore été calculé pour cet exercice. Le calcul se lance depuis le
          web.
        </EmptyNote>
      ) : (
        <StatGrid>
          <StatTile
            label="CA HT comptabilisé"
            value={euros(totals.revenueAccountingCents)}
            hint={`Prévu ${euros(totals.revenueForecastCents)} · ${formatSignedEuros(revenueGap)} · ${totals.loadedMonths}/${totals.expectedMonths} mois`}
          />
          <StatTile
            label="Marge comptabilisée"
            value={show(totals.marginAccountingCents)}
            hint={
              showAmounts && marginRate !== null ? `Taux ${formatPercent(marginRate)}` : undefined
            }
          />
          <StatTile
            label="Résultat comptable"
            value={show(totals.resultAccountingCents)}
            tone={
              showAmounts ? (totals.resultAccountingCents >= 0 ? 'success' : 'danger') : 'default'
            }
            hint="Produits − charges Teogest"
          />
          <StatTile
            label="Résultat estimé"
            value={show(totals.resultEstimatedCents)}
            tone={
              showAmounts ? (totals.resultEstimatedCents >= 0 ? 'success' : 'danger') : 'default'
            }
            hint={
              showAmounts
                ? `Écart ${formatSignedEuros(totals.resultGapCents)}`
                : 'Marge prévue − autres charges'
            }
          />
          {anomalyCount !== null ? (
            <StatTile
              label="Anomalies de charges"
              value={formatInteger(anomalyCount)}
              tone={anomalyCount === 0 ? 'success' : highAnomalyCount > 0 ? 'danger' : 'warning'}
              hint={
                anomalyCount === 0
                  ? 'Aucune charge manquante'
                  : highAnomalyCount > 0
                    ? `dont ${highAnomalyCount} prioritaire${highAnomalyCount > 1 ? 's' : ''}`
                    : 'à vérifier'
              }
            />
          ) : null}
        </StatGrid>
      )}
    </Panel>
  );
}

const STATUS_TONE: Record<PnlMonthStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ok: 'success',
  gap: 'danger',
  not_entered: 'warning',
  in_progress: 'neutral',
};

function MonthsPanel({
  snapshots,
  showAmounts,
  onSelect,
}: {
  snapshots: FinancePnlSnapshotsResponse;
  showAmounts: boolean;
  onSelect: (month: number) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const byMonth = new Map<number, FinancePnlMonthResponse>(
    snapshots.snapshots.map((item) => [item.month, item]),
  );
  const toneColor = {
    success: t.success,
    warning: t.warning,
    danger: t.danger,
    neutral: t.neutral,
  } as const;

  return (
    <Panel title="Mois : prévu, comptabilité, résultat">
      <View style={styles.list}>
        {snapshots.months.map((meta) => {
          const data = byMonth.get(meta.month);
          const status = data ? monthStatus(data) : null;
          const color = status ? toneColor[STATUS_TONE[status]] : t.textSubtle;
          const revenue = data ? revenueLine(data) : undefined;
          return (
            <Pressable
              key={meta.month}
              disabled={!data}
              onPress={() => onSelect(meta.month)}
              accessibilityRole="button"
              accessibilityLabel={`${meta.label} : ${data ? PNL_STATUS_LABELS[status ?? 'ok'] : 'non calculé'}`}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{meta.label}</Text>
                <Text style={styles.rowDetail}>
                  {data
                    ? `CA ${euros(revenue?.accountingCents ?? 0)} · résultat ${
                        showAmounts ? euros(data.result.accountingCents) : MASK
                      }`
                    : 'Non calculé'}
                </Text>
              </View>
              {status ? (
                <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.14) }]}>
                  <Text style={[styles.badgeText, { color }]}>{PNL_STATUS_LABELS[status]}</Text>
                </View>
              ) : null}
              {data ? <ChevronRight size={16} color={t.textFaint} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Panel>
  );
}

const SEVERITY_LABELS = { high: 'Prioritaire', medium: 'Moyenne', low: 'Faible' } as const;

function AnomaliesPanel({
  anomalies,
  loading,
  error,
  notComputed,
  showAmounts,
  onRetry,
  onSelectMonth,
}: {
  anomalies: FinanceAnomaly[];
  loading: boolean;
  error: unknown;
  notComputed: number[];
  showAmounts: boolean;
  onRetry: () => void;
  onSelectMonth: (month: number) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const severityColor = { high: t.danger, medium: t.warning, low: t.neutral } as const;

  return (
    <Panel title="Anomalies de charges">
      <DataState
        loading={loading}
        hasData={!loading && !error}
        error={error}
        fallback="Impossible de charger les anomalies"
        onRetry={onRetry}
        skeletonHeight={100}
      >
        {anomalies.length === 0 ? (
          <EmptyNote>Aucune charge manquante sur les mois calculés.</EmptyNote>
        ) : (
          <View style={styles.list}>
            {anomalies.map((item) => {
              const color = severityColor[item.severity];
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onSelectMonth(item.month)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Text style={styles.anomalyMonth}>{SHORT_MONTHS[item.month - 1]}</Text>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{item.label}</Text>
                    <Text style={styles.rowDetail}>
                      {item.detail}
                      {showAmounts && item.expectedCents !== null
                        ? ` · attendu ${euros(item.expectedCents)}, constaté ${euros(item.actualCents)}`
                        : ''}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.14) }]}>
                    <Text style={[styles.badgeText, { color }]}>
                      {SEVERITY_LABELS[item.severity]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {notComputed.length > 0 ? (
          <Text style={styles.hint}>
            Mois non calculés, donc non évalués :{' '}
            {notComputed.map((month) => SHORT_MONTHS[month - 1]).join(', ')}.
          </Text>
        ) : null}
      </DataState>
    </Panel>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.sm },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  rowPressed: { backgroundColor: t.surfaceStrong },
  rowText: { flex: 1, gap: 1 },
  rowName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  rowDetail: { fontSize: 11, lineHeight: 15, color: t.textSubtle },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },
  anomalyMonth: { width: 34, fontSize: fontSize.xs, fontWeight: '800', color: t.textMuted },
  hint: { fontSize: 11, color: t.textSubtle },
}));
