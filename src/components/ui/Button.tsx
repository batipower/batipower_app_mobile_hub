import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { hitTarget, makeStyles, radius, spacing, typography, useTheme } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Variantes du `Button` web : `primary`, `secondary` (gris), `outline` (bordure) et `ghost`. */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Action destructive (ex. déconnexion) : libellé en rouge pour la variante `ghost`. */
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Icône affichée à droite du libellé. */
  trailingIcon?: ReactNode;
  /** Icône affichée à gauche du libellé. */
  leadingIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  destructive = false,
  loading = false,
  disabled = false,
  trailingIcon,
  leadingIcon,
  style,
  testID,
}: ButtonProps) {
  const styles = useStyles();
  const t = useTheme();
  const inactive = disabled || loading;
  const isPrimary = variant === 'primary';

  const handlePress = () => {
    if (inactive) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isPrimary && pressed && { backgroundColor: t.accentPressed },
        !isPrimary && pressed && { backgroundColor: t.surfaceStrong },
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? t.onAccent : t.textMuted} />
      ) : (
        <>
          {leadingIcon}
          <Text
            style={[
              styles.label,
              variant === 'ghost' && styles.ghostLabel,
              (variant === 'secondary' || variant === 'outline') && styles.neutralLabel,
              !isPrimary && destructive && styles.destructiveLabel,
            ]}
          >
            {label}
          </Text>
          {trailingIcon}
        </>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: hitTarget,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: { backgroundColor: t.accent },
  secondary: { backgroundColor: t.surfaceStrong },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  pressed: { transform: [{ scale: 0.98 }] },
  inactive: { opacity: 0.5 },
  label: { ...typography.button, color: t.onAccent },
  ghostLabel: { color: t.textMuted },
  neutralLabel: { color: t.text },
  destructiveLabel: { color: t.danger },
}));
