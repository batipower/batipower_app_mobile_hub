import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';

import type { ReturnBrokenCause, ReturnItemCondition } from '@/api/hubReturns';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { CONDITION_OPTIONS, isConditionActive } from '../constants';

type ConditionPickerProps = {
  condition: ReturnItemCondition | null | undefined;
  brokenCause: ReturnBrokenCause | null | undefined;
  onSelect: (condition: ReturnItemCondition, brokenCause: ReturnBrokenCause | null) => void;
  disabled?: boolean;
  /** Clé (`conditionKey`) de l'état en cours d'enregistrement : affiche un spinner. */
  pendingKey?: string | null;
};

/** État de l'article retourné : 4 gros boutons, l'état choisi ressort (teinte, bordure, coche). */
export function ConditionPicker({
  condition,
  brokenCause,
  onSelect,
  disabled,
  pendingKey,
}: ConditionPickerProps) {
  const styles = useStyles();
  const t = useTheme();

  return (
    <View style={styles.list}>
      {CONDITION_OPTIONS.map((option) => {
        const selected = isConditionActive(option, condition, brokenCause);
        const pending = pendingKey === option.key;
        const color = option.tone === 'green' ? t.success : t.danger;
        const Icon = option.icon;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !!disabled, busy: pending }}
            accessibilityLabel={option.label}
            disabled={disabled}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onSelect(option.condition, option.cause);
            }}
            style={({ pressed }) => [
              styles.option,
              selected && { borderColor: color, backgroundColor: withAlpha(color, 0.14) },
              pressed && { opacity: 0.7 },
              disabled && !pending && { opacity: 0.5 },
            ]}
          >
            {pending ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <Icon size={20} color={selected ? color : t.textMuted} />
            )}
            <Text style={[styles.label, selected && { color }]}>{option.label}</Text>
            {selected ? <Check size={18} color={color} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.sm },
  option: {
    minHeight: hitTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  label: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: t.text },
}));
