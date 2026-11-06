import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
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
        isPrimary ? styles.primary : styles.ghost,
        isPrimary && !inactive && styles.primaryShadow,
        isPrimary && pressed && { backgroundColor: t.accentPressed },
        !isPrimary && pressed && { backgroundColor: t.surface },
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
              !isPrimary && styles.ghostLabel,
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
    minHeight: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: { backgroundColor: t.accent },
  primaryShadow: {
    shadowColor: t.accent,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  ghost: { backgroundColor: 'transparent' },
  pressed: { transform: [{ scale: 0.98 }] },
  inactive: { opacity: 0.5 },
  label: { ...typography.button, color: t.onAccent },
  ghostLabel: { color: t.textMuted },
  destructiveLabel: { color: t.danger },
}));
