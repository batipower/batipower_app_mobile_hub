import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { formatEuroWhole, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, shadow, spacing, useTheme } from '@/theme';

import {
  brandAlerts,
  costRatios,
  rateGap,
  COST_LINE_IDS,
  COST_LINE_LABELS,
} from '../lib/diagnostic';
import { formatPoints, formatRate, marginColor } from '../lib/display';
import {
  currentRateGap,
  currentRateOf,
  marginOf,
  type BrandMarginRow,
  type MarginView,
} from '../lib/model';
import type { HubBrandMarginFigures } from '@/types/hubBrandMargin';
import { AlertBadges } from './primitives';

type BrandCardProps = {
  row: BrandMarginRow;
  /** Moyenne de toutes les marques sur le même périmètre (comparaisons et alertes). */
  average: HubBrandMarginFigures;
  view: MarginView;
  onPress: (brand: string) => void;
};

/**
 * Marque dans la liste : CA, marge et taux, écart de taux avec la moyenne, postes de coût en % du CA
 * et alertes de diagnostic.
 */
function BrandCardBase({ row, average, view, onPress }: BrandCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const margin = marginOf(row.totals, view);
  const gap = rateGap(row.totals, average, view);
  const current = currentRateOf(row.totals, view);
  const currentGap = currentRateGap(row.totals, view);
  const ratios = costRatios(row.totals);
  const alerts = brandAlerts(row.totals, average, view);
  const color = marginColor(t, margin.value);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.brand}, chiffre d'affaires ${formatEuroWhole(row.totals.caHT)}, marge ${formatEuroWhole(margin.value)}, taux ${formatRate(margin.rate)}, taux actuel ${formatRate(current?.rate)}`}
      onPress={() => onPress(row.brand)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.brand} numberOfLines={1}>
          {row.brand}
        </Text>
        <ChevronRight size={16} color={t.textFaint} />
      </View>

      <View style={styles.figures}>
        <View style={styles.figure}>
          <Text style={styles.caption}>CA HT</Text>
          <Text style={styles.value}>{formatEuroWhole(row.totals.caHT)}</Text>
        </View>
        <View style={styles.figure}>
          <Text style={styles.caption}>Marge</Text>
          <Text style={[styles.value, { color }]}>{formatEuroWhole(margin.value)}</Text>
        </View>
        <View style={styles.rateBlock}>
          <Text style={styles.caption}>Taux de marge</Text>
          <Text style={[styles.rateValue, { color }]}>{formatRate(margin.rate)}</Text>
          {gap != null ? (
            <Text style={[styles.gap, { color: gap < 0 ? t.danger : t.textMuted }]}>
              {formatPoints(gap)} vs moy.
            </Text>
          ) : null}
          <View style={styles.currentLine}>
            <Text style={styles.currentLabel}>Actuel</Text>
            <Text style={styles.currentValue}>{formatRate(current?.rate)}</Text>
            {currentGap != null ? (
              <Text
                style={[styles.gap, { color: currentGap < -0.05 ? t.danger : t.accentText }]}
              >
                {formatPoints(currentGap)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={styles.costs} numberOfLines={1}>
        {COST_LINE_IDS.map((id) => `${COST_LINE_LABELS[id]} ${formatPercent(ratios[id], 0)}`).join(
          '  ·  ',
        )}
      </Text>

      <AlertBadges alerts={alerts} />
    </Pressable>
  );
}

export const BrandCard = memo(BrandCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: t.text },
  figures: { flexDirection: 'row', gap: spacing.md },
  figure: { flex: 1, gap: 1 },
  // Colonne mise en avant : c'est le taux de marge (réalisé et actuel) sur lequel on travaille.
  rateBlock: {
    flex: 1.5,
    gap: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: t.accent,
    backgroundColor: `${t.accent}26`,
  },
  rateValue: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
  currentLine: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs },
  currentLabel: { fontSize: 11, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase' },
  currentValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  caption: { fontSize: 11, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase' },
  value: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  gap: { fontSize: 11, fontWeight: '600' },
  costs: { fontSize: fontSize.xs, color: t.textMuted },
}));
