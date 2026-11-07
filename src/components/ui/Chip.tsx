import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

import { fontSize, hitTarget, makeStyles, radius, spacing, withAlpha } from '@/theme';

type ChipProps = {
  label: string;
  /** Compteur affiché à droite du libellé. */
  count?: number;
  /** Élément avant le libellé (logo d'une origine…). */
  icon?: ReactNode;
  active: boolean;
  onPress: () => void;
};

/** Puce de filtre (origine d'une commande, rôle d'un compte…), à sélection unique. */
export function Chip({ label, count, icon, active, onPress }: ChipProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => {
        if (active) return;
        void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      {count !== undefined ? (
        <Text style={[styles.count, active && styles.labelActive]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    minHeight: hitTarget - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  chipActive: { borderColor: withAlpha(t.accent, 0.5), backgroundColor: withAlpha(t.accent, 0.16) },
  label: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  labelActive: { color: t.accentText },
  count: { fontSize: 11, fontWeight: '700', color: t.textSubtle },
}));
