import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

import { fontSize, hitTarget, makeStyles, radius, spacing, withAlpha } from '@/theme';

type FilterPillProps = {
  label: string;
  /** `on` : filtre actif (vert) ; `negative` : filtre inversé (rouge, ex. « non surveillés »). */
  state: 'off' | 'on' | 'negative';
  onPress: () => void;
  icon?: ReactNode;
  /** Élément à droite du libellé (croix d'une puce retirable). */
  trailing?: ReactNode;
};

/**
 * Puce de raccourci ou de filtre actif. Contrairement à `Chip`, un appui sur une puce
 * active est transmis : c'est ce qui permet de la désactiver ou de passer à l'état suivant.
 */
export function FilterPill({ label, state, onPress, icon, trailing }: FilterPillProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: state !== 'off' }}
      accessibilityLabel={label}
      style={[styles.pill, state === 'on' && styles.on, state === 'negative' && styles.negative]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          state === 'on' && styles.labelOn,
          state === 'negative' && styles.labelNeg,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {trailing}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  pill: {
    minHeight: hitTarget - 8,
    maxWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  on: { borderColor: withAlpha(t.accent, 0.5), backgroundColor: withAlpha(t.accent, 0.16) },
  negative: { borderColor: withAlpha(t.danger, 0.5), backgroundColor: withAlpha(t.danger, 0.12) },
  label: { flexShrink: 1, fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  labelOn: { color: t.accentText },
  labelNeg: { color: t.danger },
}));
