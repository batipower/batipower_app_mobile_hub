import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDown, ArrowUp, Check } from 'lucide-react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import {
  countActiveBrandMarginFilters,
  patchBrandMarginFilters,
  resetBrandMarginFilters,
  useBrandMarginFilters,
} from './filtersStore';
import { ORIGIN_LABELS, PERIOD_PRESETS, type SortKey } from './lib/model';

const ORIGIN_OPTIONS = Object.entries(ORIGIN_LABELS)
  .filter(([origin]) => origin !== 'UNKNOWN')
  .map(([value, label]) => ({ value, label }));

const SORT_OPTIONS: readonly { key: SortKey; label: string; defaultDesc: boolean }[] = [
  { key: 'caHT', label: "Chiffre d'affaires", defaultDesc: true },
  { key: 'margin', label: 'Marge', defaultDesc: true },
  { key: 'rate', label: 'Taux de marge', defaultDesc: true },
  { key: 'siteRate', label: 'Taux de marge site', defaultDesc: true },
  { key: 'savImpact', label: 'Impact SAV', defaultDesc: true },
  { key: 'brand', label: 'Nom de la marque', defaultDesc: false },
];

/** Filtres de la marge par marque : période, marketplace et tri de la liste. */
export function BrandMarginFiltersSheet() {
  const styles = useStyles();
  const t = useTheme();
  const filters = useBrandMarginFilters();

  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        disabled: countActiveBrandMarginFilters(filters) === 0,
        onPress: resetBrandMarginFilters,
      }}
    >
      <SheetSection title="Période">
        <View>
          {PERIOD_PRESETS.map((preset) => {
            const selected = filters.period === preset.id;
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => patchBrandMarginFilters({ period: preset.id })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
              >
                <Text style={styles.label}>{preset.label}</Text>
                {selected ? <Check size={18} color={t.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SheetSection>

      <SheetSection title="Marketplace">
        <View>
          {[{ value: null, label: 'Toutes' }, ...ORIGIN_OPTIONS].map((option) => {
            const selected = filters.origin === option.value;
            return (
              <Pressable
                key={option.value ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => patchBrandMarginFilters({ origin: option.value })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
              >
                <Text style={styles.label}>{option.label}</Text>
                {selected ? <Check size={18} color={t.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SheetSection>

      <SheetSection title="Tri de la liste">
        <View>
          {SORT_OPTIONS.map((option) => {
            const selected = filters.sort === option.key;
            const Arrow = filters.desc ? ArrowDown : ArrowUp;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityHint={selected ? "Appuyer pour inverser l'ordre" : undefined}
                onPress={() =>
                  patchBrandMarginFilters(
                    selected
                      ? { desc: !filters.desc }
                      : { sort: option.key, desc: option.defaultDesc },
                  )
                }
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
              >
                <Text style={styles.label}>{option.label}</Text>
                {selected ? <Arrow size={18} color={t.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  label: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
}));
