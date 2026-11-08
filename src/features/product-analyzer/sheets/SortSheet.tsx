import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { MONTHLY_POTENTIAL_SORT_OPTIONS } from '@/features/product-analyzer/lib/constants';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';
import type { StagingSortByApi } from '@/types/hubProductAnalyzer';

import { patchPaFilters, usePaFilters } from '../filtersStore';

type SortOption = { value: StagingSortByApi; label: string };

const GROUPS: { title: string; options: SortOption[] }[] = [
  {
    title: 'Analyse',
    options: [
      { value: 'lastAnalyzedAt', label: 'Dernière analyse' },
      { value: 'createdAt', label: 'Date de création' },
    ],
  },
  {
    title: 'Rentabilité',
    options: [
      { value: 'marginPercent', label: 'Marge' },
      { value: 'viabilityDegree', label: 'Degré de viabilité' },
      { value: 'recommendedBuyPrice', label: "Prix d'achat max" },
      { value: 'negotiationGapHT', label: 'Écart à négocier' },
    ],
  },
  { title: 'Logistique', options: [{ value: 'weightGrams', label: 'Poids' }] },
  {
    title: 'Potentiel mensuel',
    options: MONTHLY_POTENTIAL_SORT_OPTIONS.map((o) => ({
      value: o.key,
      label: `${o.flag} ${o.label}`,
    })),
  },
];

/** Tri de l'historique : critère (mêmes valeurs que le web) et sens. */
export function SortSheet() {
  const styles = useStyles();
  const t = useTheme();
  const { sortBy, sortOrder } = usePaFilters();
  const isDefault = sortBy === 'lastAnalyzedAt' && sortOrder === 'desc';

  return (
    <SheetScreen
      title="Trier"
      leading={{
        label: 'Par défaut',
        disabled: isDefault,
        onPress: () => patchPaFilters({ sortBy: 'lastAnalyzedAt', sortOrder: 'desc' }),
      }}
    >
      <SegmentedControl
        segments={[
          { key: 'desc', label: 'Décroissant' },
          { key: 'asc', label: 'Croissant' },
        ]}
        value={sortOrder}
        onChange={(order) => patchPaFilters({ sortOrder: order })}
      />
      {GROUPS.map((group) => (
        <SheetSection key={group.title} title={group.title}>
          <View>
            {group.options.map((option) => {
              const selected = sortBy === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    patchPaFilters({ sortBy: option.value });
                    router.back();
                  }}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
                >
                  <Text style={styles.label}>{option.label}</Text>
                  {selected ? <Check size={18} color={t.accentText} /> : null}
                </Pressable>
              );
            })}
          </View>
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
}));
