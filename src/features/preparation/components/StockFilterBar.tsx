import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, onDark, radius, spacing, withAlpha } from '@/theme';
import type { StockFilter } from '@/types/preparation';

import { STOCK_FILTER_LABEL, STOCK_FILTER_ORDER } from '../constants';

/** Couleur d'accent de chaque filtre, comme les pastilles de la page web. */
const FILTER_COLOR: Record<StockFilter, string> = {
  all: colors.green,
  stock: colors.success,
  attente: colors.warning,
  nonaffecte: colors.danger,
};

type StockFilterBarProps = {
  value: StockFilter;
  counts: Record<StockFilter, number>;
  onChange: (filter: StockFilter) => void;
};

/** Pastilles de filtre défilantes : Toutes, En stock QG, Attente livreur, Non affecté. */
export function StockFilterBar({ value, counts, onChange }: StockFilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {STOCK_FILTER_ORDER.map((filter) => {
        const active = filter === value;
        const accent = FILTER_COLOR[filter];
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
            <Text style={[styles.label, active && { color: colors.white }]}>
              {STOCK_FILTER_LABEL[filter]}
            </Text>
            <Text style={[styles.count, active && { color: accent }]}>{counts[filter]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: onDark.borderStrong,
    backgroundColor: onDark.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600', color: onDark.textMuted },
  count: { fontSize: 13, fontWeight: '700', color: onDark.textSubtle },
});
