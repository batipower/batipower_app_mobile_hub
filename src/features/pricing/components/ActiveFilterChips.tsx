import { useMemo } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { X } from 'lucide-react-native';

import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { buildFilterChips } from '../filterLabels';
import { patchPricingFilters, resetPricingFilters, usePricingState } from '../filtersStore';
import { usePricingAffaires } from '../hooks/usePricingOptions';
import { FilterPill } from './FilterPill';

/**
 * Puces des filtres actifs, chacune retirable. La recherche n'y figure pas : elle reste
 * visible (et effaçable) dans la barre de recherche native.
 */
export function ActiveFilterChips() {
  const styles = useStyles();
  const t = useTheme();
  const { filters } = usePricingState();
  const { affaires } = usePricingAffaires(!!filters.affaireId);

  const chips = useMemo(
    () => buildFilterChips(filters, affaires).filter((chip) => chip.key !== 'search'),
    [filters, affaires],
  );

  if (chips.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {chips.map((chip) => (
        <FilterPill
          key={chip.key}
          label={chip.label}
          state="on"
          onPress={() => patchPricingFilters(chip.clearPatch)}
          trailing={<X size={12} color={t.accentText} />}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Effacer tous les filtres"
        hitSlop={8}
        onPress={resetPricingFilters}
      >
        <Text style={styles.clear}>Tout effacer</Text>
      </Pressable>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  row: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  clear: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: t.accentText,
    paddingHorizontal: spacing.sm,
  },
}));
