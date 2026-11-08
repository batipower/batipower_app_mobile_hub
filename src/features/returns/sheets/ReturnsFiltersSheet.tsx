import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import {
  RETURN_HISTORY_SOURCES,
  RETURN_HISTORY_TYPES,
  returnSourceLabel,
} from '../constants';
import {
  countActiveReturnsFilters,
  patchReturnsFilters,
  resetReturnsFilters,
  useReturnsFilters,
} from '../filtersStore';

/** Filtres de l'historique des retours : source (site ou marketplace) et état de l'article. */
export function ReturnsFiltersSheet() {
  const styles = useStyles();
  const t = useTheme();
  const filters = useReturnsFilters();

  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        disabled: countActiveReturnsFilters(filters) === 0,
        onPress: resetReturnsFilters,
      }}
    >
      <SheetSection title="Source">
        <View>
          {RETURN_HISTORY_SOURCES.map((source) => {
            const selected = filters.source === source;
            return (
              <Pressable
                key={source}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => patchReturnsFilters({ source })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
              >
                <Text style={styles.label}>{returnSourceLabel(source)}</Text>
                {selected ? <Check size={18} color={t.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SheetSection>

      <SheetSection title="État de l'article">
        <View>
          {RETURN_HISTORY_TYPES.map((type) => {
            const selected = filters.type === type.value;
            return (
              <Pressable
                key={type.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => patchReturnsFilters({ type: type.value })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
              >
                <Text style={styles.label}>{type.label}</Text>
                {selected ? <Check size={18} color={t.accentText} /> : null}
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
