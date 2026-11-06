import { useState, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';

import { colors, hitTarget, onDark, radius, spacing, typography, withAlpha } from '@/theme';

/** Instance d'un `TextInput` (pour `ref.current?.focus()`). */
export type TextInputHandle = ComponentRef<typeof TextInput>;

type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  ref?: Ref<TextInputHandle>;
  label: string;
  error?: string;
  /** Icône affichée à gauche dans le champ. */
  icon?: LucideIcon;
  /** Pour un mot de passe : ajoute le bouton afficher/masquer. */
  secureToggle?: boolean;
};

export function TextField({
  ref,
  label,
  error,
  icon: Icon,
  secureToggle = false,
  secureTextEntry,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const hidden = secureToggle ? !revealed : secureTextEntry;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error ? styles.fieldError : undefined,
        ]}
      >
        {Icon ? (
          <Icon size={18} color={onDark.textFaint} style={styles.icon} strokeWidth={2} />
        ) : null}
        <TextInput
          ref={ref}
          style={[styles.input, Icon ? styles.inputWithIcon : undefined]}
          placeholderTextColor={withAlpha(colors.white, 0.25)}
          selectionColor={colors.green}
          keyboardAppearance="dark"
          accessibilityLabel={label}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            style={styles.toggle}
          >
            {revealed ? (
              <EyeOff size={18} color={onDark.textSubtle} />
            ) : (
              <Eye size={18} color={onDark.textSubtle} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...typography.label, color: onDark.textMuted },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: onDark.border,
    backgroundColor: onDark.surface,
  },
  fieldFocused: {
    borderColor: withAlpha(colors.green, 0.55),
    backgroundColor: withAlpha(colors.green, 0.04),
  },
  fieldError: { borderColor: withAlpha(colors.danger, 0.7) },
  icon: { position: 'absolute', left: spacing.md + 2 },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md + 2,
    color: colors.white,
    fontSize: 16,
  },
  inputWithIcon: { paddingLeft: 42 },
  toggle: {
    minWidth: hitTarget,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: 12, color: colors.danger },
});
