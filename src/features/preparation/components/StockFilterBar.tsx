import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { makeStyles, radius, spacing, useTheme, withAlpha, type Theme } from '@/theme';
import type { StockFilter } from '@/types/preparation';

import { STOCK_FILTER_LABEL, STOCK_FILTER_ORDER } from '../constants';

/** Couleur d'accent de chaque filtre, comme les pastilles de la page web. */
function filterColor(t: Theme, filter: StockFilter): string {
  switch (filter) {
    case 'all':
      return t.accentText;
    case 'stock':
      return t.success;
    case 'attente':
      return t.warning;
    case 'nonaffecte':
      return t.danger;
  }
}

type StockFilterBarProps = {
  value: StockFilter;
  counts: Record<StockFilter, number>;
  onChange: (filter: StockFilter) => void;
};

/** Pastilles de filtre défilantes : Toutes, En stock QG, Attente livreur, Non affecté. */
export function StockFilterBar({ value, counts, onChange }: StockFilterBarProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {STOCK_FILTER_ORDER.map((filter) => {
        const active = filter === value;
        const accent = filterColor(t, filter);
        return (
          <Pressable
            key={filter}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(filter);
            }}
            style={[
              styles.chip,
              active && { backgroundColor: withAlpha(accent, 0.16), borderColor: accent },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.label, active && { color: t.text }]}>
              {STOCK_FILTER_LABEL[filter]}
            </Text>
            <Text style={[styles.count, active && { color: accent }]}>{counts[filter]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.borderStrong,
    backgroundColor: t.card,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600', color: t.textMuted },
  count: { fontSize: 13, fontWeight: '700', color: t.textSubtle },
}));
