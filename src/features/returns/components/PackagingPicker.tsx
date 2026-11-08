import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import type { ReturnPackagingCondition } from '@/api/hubReturns';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { PACKAGING_OPTIONS } from '../constants';

type PackagingPickerProps = {
  value: ReturnPackagingCondition | null | undefined;
  /** `null` : second appui sur la pastille active, l'état est effacé. */
  onChange: (value: ReturnPackagingCondition | null) => void;
  disabled?: boolean;
  /** Pastille en cours d'enregistrement : affiche un spinner. */
  pendingValue?: ReturnPackagingCondition | null;
};

/** État facultatif de l'emballage : 5 pastilles, un second appui sur la pastille active l'efface. */
export function PackagingPicker({ value, onChange, disabled, pendingValue }: PackagingPickerProps) {
  const styles = useStyles();
  const t = useTheme();

  return (
    <View style={styles.wrap}>
      {PACKAGING_OPTIONS.map((option) => {
        const selected = value === option.value;
        const pending = pendingValue === option.value;
        const color = {
          green: t.success,
          amber: t.warning,
          red: t.danger,
          neutral: t.textMuted,
        }[option.tone];
        const Icon = option.icon;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !!disabled, busy: pending }}
            accessibilityLabel={option.label}
            accessibilityHint={selected ? 'Appuyer pour effacer' : undefined}
            disabled={disabled}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(selected ? null : option.value);
            }}
            style={({ pressed }) => [
              styles.pill,
              selected && { borderColor: color, backgroundColor: withAlpha(color, 0.14) },
              pressed && { opacity: 0.7 },
              disabled && !pending && { opacity: 0.5 },
            ]}
          >
            {pending ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <Icon size={16} color={selected ? color : t.textMuted} />
            )}
            <Text style={[styles.label, selected && { color }]} numberOfLines={1}>
              {option.shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    minHeight: hitTarget - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  label: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
}));
