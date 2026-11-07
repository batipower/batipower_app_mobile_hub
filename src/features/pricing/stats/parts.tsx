import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react-native';

import { formatPercent, percentDelta } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { HubPricingInsightMetrics, HubPricingSelectionStatsTotals } from '@/types/hubPricing';

/** Variation en % par rapport à la période précédente (N-1), avec flèche et couleur. */
export function Delta({ current, previous }: { current: number; previous: number }) {
  const styles = useStyles();
  const t = useTheme();
  const delta = percentDelta(current, previous);
  if (delta == null) return <Text style={styles.deltaNeutral}>—</Text>;
  const flat = Math.abs(delta) < 0.5;
  const up = delta > 0;
  const color = flat ? t.textSubtle : up ? t.success : t.danger;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <View style={styles.delta}>
      <Icon size={13} color={color} />
      <Text style={[styles.deltaText, { color }]}>
        {up && !flat ? '+' : ''}
        {formatPercent(delta, 0)}
      </Text>
    </View>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  previousLabel?: string;
  delta?: ReactNode;
  tone?: 'default' | 'hero';
  hint?: string;
};

export function KpiCard({
  label,
  value,
  previousLabel,
  delta,
  tone = 'default',
  hint,
}: KpiCardProps) {
  const styles = useStyles();
  const hero = tone === 'hero';
  return (
    <View style={[styles.kpi, hero && styles.kpiHero]}>
      <Text style={[styles.kpiLabel, hero && styles.kpiLabelHero]}>{label}</Text>
      <Text
        style={[styles.kpiValue, hero && styles.kpiValueHero]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <View style={styles.kpiFooter}>
        {delta}
        {previousLabel ? (
          <Text style={[styles.kpiPrevious, hero && styles.kpiLabelHero]}>{previousLabel}</Text>
        ) : null}
      </View>
      {hint ? <Text style={[styles.kpiHint, hero && styles.kpiLabelHero]}>{hint}</Text> : null}
    </View>
  );
}

/** Barre horizontale proportionnelle : libellé, valeur, et barre de la valeur sur le maximum. */
export function BarRow({
  label,
  value,
  ratio,
  trailing,
  sublabel,
}: {
  label: string;
  value: string;
  /** 0 → 1. */
  ratio: number;
  trailing?: ReactNode;
  sublabel?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.barRow}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barValue}>{value}</Text>
        {trailing}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(2, Math.min(100, ratio * 100))}%` }]} />
      </View>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </View>
  );
}

/** Bloc titré, comme une carte de la feuille. */
export function StatsCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function EmptyNote({ text }: { text: string }) {
  const styles = useStyles();
  return <Text style={styles.empty}>{text}</Text>;
}

/** Ligne d'un tableau de métriques : libellé et valeur alignés. */
export function MetricLine({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.metricLine}>
      <Text style={[styles.metricLabel, emphasis && styles.metricEmphasis]}>{label}</Text>
      <Text style={[styles.metricValue, emphasis && styles.metricEmphasis]}>{value}</Text>
    </View>
  );
}

export interface DerivedTotals {
  caHT: number;
  quantity: number;
  orders: number;
  purchasesHT: number;
  /** CA HT − achats HT. `null` si aucun prix d'achat connu. */
  marginHT: number | null;
  marginRate: number | null;
  basketHT: number | null;
}

/** Totaux dérivés d'une période (`deriveTotals` du web). */
export function deriveTotals(totals: HubPricingSelectionStatsTotals): DerivedTotals {
  const hasPurchases = totals.purchasesHT > 0;
  const marginHT = hasPurchases ? totals.caHT - totals.purchasesHT : null;
  return {
    caHT: totals.caHT,
    quantity: totals.quantity,
    orders: totals.orders,
    purchasesHT: totals.purchasesHT,
    marginHT,
    marginRate: marginHT != null && totals.caHT > 0 ? (marginHT / totals.caHT) * 100 : null,
    basketHT: totals.orders > 0 ? totals.caHT / totals.orders : null,
  };
}

/** Part de `value` dans `total`, en 0 → 1. */
export function ratioOf(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

export function metricsDelta(metrics: HubPricingInsightMetrics) {
  return <Delta current={metrics.caHT} previous={metrics.previousCaHT} />;
}

const useStyles = makeStyles((t) => ({
  delta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  deltaText: { fontSize: fontSize.xs, fontWeight: '700' },
  deltaNeutral: { fontSize: fontSize.xs, color: t.textSubtle },
  kpi: {
    flexGrow: 1,
    flexBasis: '47%',
    gap: 4,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  kpiHero: { flexBasis: '100%', backgroundColor: t.accent, borderColor: t.accent },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  kpiLabelHero: { color: withAlpha(t.onAccent, 0.8) },
  kpiValue: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  kpiValueHero: { fontSize: fontSize['2xl'], color: t.onAccent },
  kpiFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  kpiPrevious: { fontSize: 11, color: t.textSubtle },
  kpiHint: { fontSize: 10, color: t.textSubtle },
  barRow: { gap: 4 },
  barHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  barValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: t.surfaceStrong,
  },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: t.accent },
  sublabel: { fontSize: 11, color: t.textSubtle },
  card: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  cardSubtitle: { fontSize: fontSize.xs, color: t.textSubtle },
  cardBody: { gap: spacing.md, paddingTop: spacing.sm },
  empty: {
    fontSize: fontSize.sm,
    color: t.textSubtle,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  metricLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  metricLabel: { flex: 1, fontSize: fontSize.sm, color: t.textMuted },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: t.text,
    fontVariant: ['tabular-nums'],
  },
  metricEmphasis: { fontWeight: '800', color: t.text },
}));
