import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

type SelectableRowProps = {
  selected: boolean;
  /** Ligne grisée et non sélectionnable (limite atteinte, déjà jointe…). */
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  /** Contenu de la ligne (avatar, textes…), à droite de la case. */
  children: ReactNode;
  /** `radio` : sélection unique (cercle) ; `checkbox` : sélection multiple (carré). */
  mode?: 'checkbox' | 'radio';
};

/** Ligne de liste sélectionnable avec case à cocher, pour les sélecteurs en feuille. */
export function SelectableRow({
  selected,
  disabled = false,
  onPress,
  accessibilityLabel,
  children,
  mode = 'checkbox',
}: SelectableRowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={mode === 'radio' ? 'radio' : 'checkbox'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && styles.rowPressed,
        disabled && !selected && styles.rowDisabled,
      ]}
    >
      <View
        style={[
          styles.box,
          mode === 'radio' && styles.boxRound,
          selected && { borderColor: t.accent, backgroundColor: t.accent },
        ]}
      >
        {selected ? <Check size={14} color={t.onAccent} strokeWidth={3} /> : null}
      </View>
      <View style={styles.content}>{children}</View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: hitTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowSelected: { backgroundColor: withAlpha(t.accent, 0.1) },
  rowPressed: { backgroundColor: t.surfaceStrong },
  rowDisabled: { opacity: 0.45 },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm + 1,
    borderWidth: 1.5,
    borderColor: t.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxRound: { borderRadius: radius.full },
  content: { flex: 1 },
}));
