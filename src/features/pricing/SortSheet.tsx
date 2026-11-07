import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';

import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import { SheetScreen, SheetSection } from './components/SheetScreen';
import { patchPricingFilters, usePricingState } from './filtersStore';
import { SORT_OPTIONS } from './options';

const GROUPS = Array.from(new Set(SORT_OPTIONS.map((option) => option.group)));

/** Tri de la liste : critère (mêmes valeurs que le web) et sens. */
export function SortSheet() {
  const styles = useStyles();
  const t = useTheme();
  const { filters, country } = usePricingState();

  return (
    <SheetScreen
      title="Trier"
      leading={{
        label: 'Aucun tri',
        disabled: !filters.sortBy,
        onPress: () => patchPricingFilters({ sortBy: '', sortOrder: 'desc' }),
      }}
    >
      <SegmentedControl
        segments={[
          { key: 'desc', label: 'Décroissant' },
          { key: 'asc', label: 'Croissant' },
        ]}
        value={filters.sortOrder}
        onChange={(sortOrder) => patchPricingFilters({ sortOrder })}
      />

      {GROUPS.map((group) => (
        <SheetSection key={group} title={group}>
          <View>
            {SORT_OPTIONS.filter((option) => option.group === group && option.value !== '').map(
              (option) => {
                const selected = filters.sortBy === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      patchPricingFilters({ sortBy: selected ? '' : option.value });
                      router.back();
                    }}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
                  >
                    <Text style={styles.label}>{option.label}</Text>
                    {selected ? <Check size={18} color={t.accentText} /> : null}
                  </Pressable>
                );
              },
            )}
          </View>
          {group === 'Historique des ventes' && country !== 'FR' ? (
            <Text style={styles.hint}>Le tri suit le pays affiché ({country}).</Text>
          ) : null}
        </SheetSection>
      ))}
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
  hint: { fontSize: fontSize.xs, color: t.textSubtle },
}));
