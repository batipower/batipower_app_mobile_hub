import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { formatEuroWhole, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { HubBrandMarginFigures } from '@/types/hubBrandMargin';

import type { BrandMarginComparisonState } from '../hooks/useBrandMarginComparison';
import type { FiguresComparison, MarginComparison } from '../lib/comparison';
import { formatPoints, formatRate, formatSignedPercent } from '../lib/display';
import { SAV_CAUSE_LABELS, rateOfCa, savCauseEntries, type MarginView } from '../lib/model';

type TrendProps = {
  value: number | null;
  unit: 'pt' | '%';
  /** `down` : une baisse est favorable (impact SAV). */
  goodWhen?: 'up' | 'down';
};

/** Écart coloré : vert quand il va dans le bon sens, rouge sinon, neutre quand il est quasi nul. */
function Trend({ value, unit, goodWhen = 'up' }: TrendProps) {
  const t = useTheme();
  if (value == null) return null;
  const flat = Math.abs(value) < 0.05;
  const good = goodWhen === 'up' ? value > 0 : value < 0;
  const color = flat ? t.textMuted : good ? t.accentText : t.danger;
  return (
    <Text style={{ color, fontWeight: '700' }}>
      {' '}
      {unit === 'pt' ? formatPoints(value) : formatSignedPercent(value)}
    </Text>
  );
}

type ComparisonLineProps = {
  state: BrandMarginComparisonState;
  children: (comparison: FiguresComparison) => ReactNode;
};

/** Ligne « Mois dernier : … » d'une carte ; « n/a » quand le mois de référence n'a aucune vente. */
function ComparisonLine({ state, children }: ComparisonLineProps) {
  const styles = useStyles();
  if (!state.comparison) {
    return state.loading ? <Text style={styles.comparison}>Mois dernier : chargement…</Text> : null;
  }
  const comparison = state.comparison;
  return (
    <Text style={styles.comparison} numberOfLines={2}>
      <Text style={styles.comparisonLabel}>{comparison.label}</Text>
      {' : '}
      {comparison.empty ? 'n/a (aucune vente)' : children(comparison)}
    </Text>
  );
}

type CardProps = {
  label: string;
  value: string;
  /** Taux affiché en grand à côté du montant. */
  rate?: string;
  sub?: string;
  tone?: 'default' | 'hero' | 'positive' | 'negative';
  comparison?: ReactNode;
  onPress?: () => void;
  expanded?: boolean;
};

function KpiCard({ label, value, rate, sub, tone = 'default', comparison, onPress, expanded }: CardProps) {
  const styles = useStyles();
  const t = useTheme();
  const hero = tone === 'hero';
  const textColor = hero ? '#FFFFFF' : t.text;
  const mutedColor = hero ? 'rgba(255,255,255,0.7)' : t.textMuted;
  const body = (
    <View
      style={[
        styles.card,
        tone === 'hero' && styles.hero,
        tone === 'positive' && styles.positive,
        tone === 'negative' && styles.negative,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardLabel, { color: mutedColor }]} numberOfLines={1}>
          {label}
        </Text>
        {onPress ? (
          expanded ? (
            <ChevronUp size={14} color={mutedColor} />
          ) : (
            <ChevronDown size={14} color={mutedColor} />
          )
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <Text
          style={[styles.value, { color: textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
        {rate ? (
          <Text style={[styles.rate, { color: textColor }]} numberOfLines={1}>
            {rate}
          </Text>
        ) : null}
      </View>
      {sub ? (
        <Text style={[styles.sub, { color: mutedColor }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
      {comparison ? <View style={styles.comparisonBox}>{comparison}</View> : null}
    </View>
  );
  if (!onPress) return <View style={styles.cell}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      accessibilityState={{ expanded }}
      accessibilityHint="Affiche le détail par cause"
      onPress={onPress}
      style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7 }]}
    >
      {body}
    </Pressable>
  );
}

function rateLabel(rate: number | null): string {
  return rate != null ? formatRate(rate) : 'n/a';
}

type SavBreakdownProps = { figures: Pick<HubBrandMarginFigures, 'sav' | 'caHT'> };

/** Détail de l'impact SAV : avoirs, remises en stock, renvois, puis chaque cause en € et % du CA HT. */
export function SavBreakdown({ figures }: SavBreakdownProps) {
  const styles = useStyles();
  const { sav, caHT } = figures;
  const causes = savCauseEntries(figures);
  const pct = (amount: number) => {
    const rate = rateOfCa(amount, caHT);
    return rate != null ? formatRate(rate) : 'n/a';
  };
  return (
    <View style={styles.breakdown}>
      <Text style={styles.breakdownTitle}>Impact SAV</Text>
      <Text style={styles.breakdownLine}>
        {`Avoirs de pertes (hors annulation, hors retours revendables) : ${formatEuroWhole(sav.creditSlipsHT)}`}
      </Text>
      <Text style={styles.breakdownLine}>
        {`Remises en stock (coût récupéré) : -${formatEuroWhole(sav.restockRecoveredHT)}`}
      </Text>
      <Text style={styles.breakdownLine}>
        {`Renvois (achats + transport) : ${formatEuroWhole(sav.resendCostHT)}`}
      </Text>
      {causes.length > 0 ? (
        <View style={styles.causes}>
          <View style={styles.causeRow}>
            <Text style={styles.causeHead}>Par catégorie</Text>
            <Text style={styles.causeHead}>€ · % du CA</Text>
          </View>
          {causes.map(([cause, amount]) => (
            <View key={cause} style={styles.causeRow}>
              <Text style={styles.causeLabel}>{SAV_CAUSE_LABELS[cause] ?? cause}</Text>
              <Text style={styles.causeValue}>{`${formatEuroWhole(amount)} · ${pct(amount)}`}</Text>
            </View>
          ))}
          {sav.restockRecoveredHT > 0 ? (
            <View style={styles.causeRow}>
              <Text style={styles.causeLabel}>Remises en stock (déduites)</Text>
              <Text style={styles.causeValue}>
                {`-${formatEuroWhole(sav.restockRecoveredHT)} · -${pct(sav.restockRecoveredHT)}`}
              </Text>
            </View>
          ) : null}
          <View style={[styles.causeRow, styles.causeTotal]}>
            <Text style={[styles.causeLabel, styles.strong]}>Impact SAV</Text>
            <Text style={[styles.causeValue, styles.strong]}>
              {`${formatEuroWhole(sav.totalHT)} · ${pct(sav.totalHT)}`}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.breakdownLine}>Aucun impact SAV</Text>
      )}
    </View>
  );
}

type BrandMarginKpisProps = {
  totals: HubBrandMarginFigures;
  view: MarginView;
  comparison: BrandMarginComparisonState;
};

/**
 * Quatre cartes du web : CA HT, marge sans SAV, marge avec SAV (avec taux) et impact SAV, chacune
 * comparée au mois dernier complet. Un appui sur « Impact SAV » déplie le détail par cause.
 */
export function BrandMarginKpis({ totals, view, comparison }: BrandMarginKpisProps) {
  const styles = useStyles();
  const [savOpen, setSavOpen] = useState(false);
  const points =
    totals.grossMarginRate != null && totals.netMarginRate != null
      ? totals.grossMarginRate - totals.netMarginRate
      : null;
  const savSub =
    points != null && points > 0.005
      ? `${formatRate(points)} pt de marge`
      : 'Aucun impact sur la période';

  const marginComparison = (pick: (value: FiguresComparison) => MarginComparison) => (
    <ComparisonLine state={comparison}>
      {(value) => {
        const margin = pick(value);
        return (
          <>
            {`${formatEuroWhole(margin.amount)} · ${rateLabel(margin.rate)}`}
            <Trend value={margin.ratePoints} unit="pt" />
            <Trend value={margin.amountPct} unit="%" />
          </>
        );
      }}
    </ComparisonLine>
  );

  return (
    <View style={styles.root}>
      <View style={styles.grid}>
        <KpiCard
          tone="hero"
          label="CA HT"
          value={formatEuroWhole(totals.caHT)}
          sub={`${formatInteger(totals.orders)} commandes · ${formatInteger(totals.units)} pièces`}
          comparison={
            <ComparisonLine state={comparison}>
              {(value) => (
                <>
                  {formatEuroWhole(value.ca.amount)}
                  <Trend value={value.ca.amountPct} unit="%" />
                </>
              )}
            </ComparisonLine>
          }
        />
        <KpiCard
          tone={view === 'gross' ? 'positive' : 'default'}
          label="Marge sans SAV"
          value={formatEuroWhole(totals.grossMarginHT)}
          rate={rateLabel(totals.grossMarginRate)}
          sub="Avant avoirs et renvois"
          comparison={marginComparison((value) => value.gross)}
        />
        <KpiCard
          tone={view === 'net' ? 'positive' : 'default'}
          label="Marge avec SAV"
          value={formatEuroWhole(totals.netMarginHT)}
          rate={rateLabel(totals.netMarginRate)}
          sub="Après avoirs et renvois"
          comparison={marginComparison((value) => value.net)}
        />
        <KpiCard
          tone="negative"
          label="Impact SAV"
          value={totals.sav.totalHT === 0 ? '—' : `-${formatEuroWhole(totals.sav.totalHT)}`}
          sub={savSub}
          onPress={() => setSavOpen((open) => !open)}
          expanded={savOpen}
          comparison={
            <ComparisonLine state={comparison}>
              {(value) => (
                <>
                  {value.sav.amount === 0 ? '—' : `-${formatEuroWhole(value.sav.amount)}`}
                  <Trend value={value.sav.amountPct} unit="%" goodWhen="down" />
                </>
              )}
            </ComparisonLine>
          }
        />
      </View>
      {savOpen ? <SavBreakdown figures={totals} /> : null}
      {comparison.comparison && !comparison.comparison.amountsComparable ? (
        <Text style={styles.hint}>
          Le mois de référence est comparé en entier : les montants ne sont comparables en % que
          sur un mois complet, seul le taux de marge est comparé en points.
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { flexGrow: 1, flexBasis: '47%' },
  card: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  hero: { backgroundColor: '#232F3E', borderColor: '#232F3E' },
  positive: { borderColor: t.accent, backgroundColor: withAlpha(t.accent, 0.1) },
  negative: { borderColor: withAlpha(t.danger, 0.3), backgroundColor: withAlpha(t.danger, 0.05) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  value: { flexShrink: 1, fontSize: fontSize.lg, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rate: { fontSize: fontSize.xl, fontWeight: '800' },
  sub: { fontSize: 11 },
  comparisonBox: { paddingTop: 2 },
  comparison: { fontSize: 11, color: t.textMuted },
  comparisonLabel: { fontWeight: '700' },
  hint: { fontSize: 11, lineHeight: 15, color: t.textMuted },
  breakdown: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  breakdownTitle: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  breakdownLine: { fontSize: fontSize.xs, color: t.text },
  causes: { gap: 3, marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: t.border },
  causeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  causeHead: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: t.textMuted },
  causeLabel: { flex: 1, fontSize: fontSize.xs, color: t.text },
  causeValue: { fontSize: fontSize.xs, color: t.text, fontVariant: ['tabular-nums'] },
  causeTotal: { marginTop: 2, paddingTop: 4, borderTopWidth: 1, borderTopColor: t.border },
  strong: { fontWeight: '700' },
}));
