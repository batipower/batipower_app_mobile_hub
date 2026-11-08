import { Pressable, Text, View } from 'react-native';

import { MP_FLAGS, VIAB_STATUS_CFG } from '@/features/product-analyzer/lib/constants';
import { makeStyles, radius, useTheme, withAlpha } from '@/theme';
import type { ViabilityByCountry, ViabilityCountry } from '@/types/hubProductAnalyzer';

const COUNTRIES: ViabilityCountry[] = ['FR', 'DE', 'IT', 'ES', 'UK'];

/** Pastilles drapeau : la couleur du point donne la viabilité du produit dans chaque pays. */
export function CountryChips({
  data,
  focusCountry,
  onPressCountry,
}: {
  data: ViabilityByCountry | null | undefined;
  focusCountry?: string;
  onPressCountry?: (country: ViabilityCountry) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.row}>
      {COUNTRIES.map((country) => {
        const v = data?.[country];
        const cfg = v ? VIAB_STATUS_CFG[v.viabilityStatus] : null;
        const focused = focusCountry === country;
        return (
          <Pressable
            key={country}
            disabled={!onPressCountry}
            onPress={() => onPressCountry?.(country)}
            accessibilityRole={onPressCountry ? 'button' : 'text'}
            accessibilityLabel={
              v && cfg
                ? `${country} : ${cfg.label}, marge ${v.marginPercent.toFixed(1)} %`
                : `${country} : non calculable`
            }
            hitSlop={4}
            style={[
              styles.chip,
              cfg
                ? { backgroundColor: withAlpha(cfg.color, 0.12), borderColor: withAlpha(cfg.color, 0.4) }
                : { backgroundColor: t.surface, borderColor: t.border, opacity: 0.45 },
              focused && { borderColor: t.accent, borderWidth: 2 },
            ]}
          >
            <Text style={styles.flag}>{MP_FLAGS[country]}</Text>
            {cfg ? <View style={[styles.dot, { backgroundColor: cfg.color, borderColor: t.card }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', gap: 4 },
  chip: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: { fontSize: 12 },
  dot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
}));
