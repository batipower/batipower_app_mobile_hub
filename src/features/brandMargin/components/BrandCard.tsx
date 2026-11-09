import { memo, useCallback, useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';

import { formatEuroWhole, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, shadow, spacing, useTheme, withAlpha } from '@/theme';

import {
  brandAlerts,
  costRatios,
  rateGap,
  COST_LINE_IDS,
  COST_LINE_LABELS,
} from '../lib/diagnostic';
import { formatPoints, formatRate, marginColor } from '../lib/display';
import {
  SAV_CAUSE_GROUPS,
  marginOf,
  originLabel,
  rateOfCa,
  savGroupAmount,
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
  /** Affiche le détail de l'impact SAV par cause sous les coûts. */
  showSavCauses?: boolean;
  /** Ouvre la fiche de la marque. */
  onPress: (brand: string) => void;
};

/**
 * Marque dans la liste : CA, marge et taux, taux de marge du site, écart de taux avec la moyenne,
 * postes de coût en % du CA et alertes de diagnostic. Un appui déplie la marge de chaque canal ; le
 * bouton « Fiche » ouvre le détail de la marque.
 */
function BrandCardBase({ row, average, view, showSavCauses = false, onPress }: BrandCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const margin = marginOf(row.totals, view);
  const gap = rateGap(row.totals, average, view);
  const siteRate = row.site?.marginRate ?? null;
  const ratios = costRatios(row.totals);
  const alerts = brandAlerts(row.totals, average, view);
  const color = marginColor(t, margin.value);
  const savCauses = showSavCauses
    ? SAV_CAUSE_GROUPS.map((group) => ({
        id: group.id,
        label: group.label,
        amount: savGroupAmount(row.totals, group),
      })).filter((cause) => Math.abs(cause.amount) >= 0.005)
    : [];

  // Toute marque se déplie, même avec un seul canal (comme sur le web).
  const onCardPress = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  }, []);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${row.brand}, chiffre d'affaires ${formatEuroWhole(row.totals.caHT)}, marge ${formatEuroWhole(margin.value)}, taux ${formatRate(margin.rate)}, taux site ${formatRate(siteRate)}`}
        accessibilityHint="Affiche la marge de chaque canal"
        onPress={onCardPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.header}>
          <Text style={styles.brand} numberOfLines={1}>
            {row.brand}
          </Text>
          {expanded ? (
            <ChevronUp size={16} color={t.textFaint} />
          ) : (
            <ChevronDown size={16} color={t.textFaint} />
          )}
        </View>

        <View style={styles.figures}>
          <View style={styles.figure}>
            <Text style={styles.caption}>CA HT</Text>
            <Text style={styles.value}>{formatEuroWhole(row.totals.caHT)}</Text>
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
          </View>
          <View style={styles.siteBlock}>
            <Text style={styles.caption}>Taux site</Text>
            <Text
              style={[
                styles.rateValue,
                { color: siteRate != null && siteRate < 0 ? t.danger : t.info },
              ]}
            >
              {formatRate(siteRate)}
            </Text>
            {row.site && row.site.products > 0 ? (
              <Text style={[styles.gap, { color: t.textMuted }]}>{row.site.products} réf. en ligne</Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.costs} numberOfLines={1}>
          {COST_LINE_IDS.map((id) => `${COST_LINE_LABELS[id]} ${formatPercent(ratios[id], 0)}`).join(
            '  ·  ',
          )}
        </Text>

        {savCauses.length > 0 ? (
          <View style={styles.savCauses}>
            {savCauses.map((cause) => {
              const rate = rateOfCa(cause.amount, row.totals.caHT);
              return (
                <View key={cause.id} style={styles.savCause}>
                  <Text style={styles.savCauseLabel} numberOfLines={1}>
                    {cause.label}
                  </Text>
                  <Text style={styles.savCauseValue}>
                    {`${formatEuroWhole(cause.amount)}${rate != null ? ` · ${formatRate(rate)}` : ''}`}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <AlertBadges alerts={alerts} />
      </Pressable>

      {expanded ? (
        <View style={styles.origins}>
          {row.byOrigin.map((entry) => {
            const entryMargin = marginOf(entry, view);
            return (
              <View key={entry.origin} style={styles.originRow}>
                <Text style={styles.originName} numberOfLines={1}>
                  {originLabel(entry.origin)}
                </Text>
                <Text style={styles.originValue}>{formatEuroWhole(entry.caHT)}</Text>
                <Text style={[styles.originValue, { color: marginColor(t, entryMargin.value) }]}>
                  {formatEuroWhole(entryMargin.value)}
                </Text>
                <Text style={[styles.originRate, { color: marginColor(t, entryMargin.value) }]}>
                  {formatRate(entryMargin.rate)}
                </Text>
              </View>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir la fiche de ${row.brand}`}
            onPress={() => onPress(row.brand)}
            hitSlop={6}
            style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}
          >
            <Text style={styles.detailText}>Fiche de la marque</Text>
            <ChevronRight size={14} color={t.accentText} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const BrandCard = memo(BrandCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
    ...shadow.sm,
  },
  body: { gap: spacing.sm, padding: spacing.lg },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: t.text },
  figures: { flexDirection: 'row', gap: spacing.sm },
  figure: { flex: 1, gap: 1 },
  // Deux colonnes mises en avant, de couleurs distinctes : taux de marge réalisé (vert) et taux de
  // marge du site sur le catalogue en ligne (bleu).
  rateBlock: {
    flex: 1.2,
    gap: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: t.accent,
    backgroundColor: `${t.accent}26`,
  },
  siteBlock: {
    flex: 1.2,
    gap: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: t.info,
    backgroundColor: withAlpha(t.info, 0.15),
  },
  rateValue: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
  caption: { fontSize: 11, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase' },
  value: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  gap: { fontSize: 11, fontWeight: '600' },
  costs: { fontSize: fontSize.xs, color: t.textMuted },
  savCauses: { gap: 2 },
  savCause: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  savCauseLabel: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  savCauseValue: { fontSize: fontSize.xs, fontWeight: '600', color: t.danger },
  origins: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: withAlpha(t.info, 0.05),
  },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  originName: { flex: 1.2, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  originValue: { flex: 1, textAlign: 'right', fontSize: fontSize.sm, color: t.text },
  originRate: { flex: 0.8, textAlign: 'right', fontSize: fontSize.sm, fontWeight: '700' },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  detailText: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
}));
