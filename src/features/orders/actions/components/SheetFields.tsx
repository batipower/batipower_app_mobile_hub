import type { ReactNode } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { AlertTriangle, Check, Minus, Plus } from 'lucide-react-native';

import { Chip } from '@/components/ui';
import { fontSize, hitTarget, makeStyles, radius, spacing, typography, useTheme } from '@/theme';

/** Libellé + contenu d'un champ de feuille. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Texte d'aide ou d'avertissement, sous un champ ou en tête de feuille. */
export function Note({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'warning' | 'danger';
}) {
  const styles = useStyles();
  const t = useTheme();
  if (tone === 'muted') return <Text style={styles.hint}>{children}</Text>;
  const color = tone === 'danger' ? t.danger : t.warning;
  return (
    <View style={[styles.alert, { borderColor: color }]} accessibilityRole="alert">
      <AlertTriangle size={16} color={color} />
      <Text style={[styles.alertText, { color }]}>{children}</Text>
    </View>
  );
}

/** Choix unique parmi quelques valeurs (motif, entrepôt, transporteur, mode) sous forme de puces. */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <View key={option.value} style={option.disabled || disabled ? styles.chipOff : undefined}>
          <Chip
            label={option.label}
            active={option.value === value}
            onPress={() => {
              if (!option.disabled && !disabled) onChange(option.value);
            }}
          />
        </View>
      ))}
    </View>
  );
}

/** Interrupteur avec libellé et aide. */
export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.switchLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: t.accent }}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Ligne à cocher (case de confirmation, choix multiple). */
export function CheckRow({
  label,
  hint,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={styles.checkRow}
    >
      <View
        style={[
          styles.checkBox,
          checked && { backgroundColor: t.accent, borderColor: t.accent },
        ]}
      >
        {checked ? <Check size={14} color={t.onAccent} strokeWidth={3} /> : null}
      </View>
      <View style={styles.switchText}>
        <Text style={styles.switchLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Quantité entière avec boutons − / + (bornée entre `min` et `max`). */
export function Stepper({
  value,
  min = 0,
  max,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Retirer une unité, ${label}`}
        disabled={value <= min}
        hitSlop={6}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[styles.stepButton, value <= min && styles.chipOff]}
      >
        <Minus size={16} color={t.text} />
      </Pressable>
      <Text style={styles.stepValue} accessibilityLabel={`${label} : ${value}`}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ajouter une unité, ${label}`}
        disabled={value >= max}
        hitSlop={6}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={[styles.stepButton, value >= max && styles.chipOff]}
      >
        <Plus size={16} color={t.text} />
      </Pressable>
    </View>
  );
}

/** Champ de saisie numérique ou texte, au style de `TextField`, sans libellé propre. */
export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  invalid,
  multiline,
  editable = true,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  invalid?: boolean;
  multiline?: boolean;
  editable?: boolean;
  accessibilityLabel: string;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={t.textFaint}
      selectionColor={t.accentText}
      keyboardAppearance={t.scheme}
      keyboardType={keyboardType}
      multiline={multiline}
      editable={editable}
      textAlignVertical={multiline ? 'top' : 'center'}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.input,
        multiline && { minHeight: 96 },
        invalid && { borderColor: t.danger },
        !editable && { opacity: 0.5 },
      ]}
    />
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: spacing.sm },
  label: { ...typography.label, color: t.textMuted },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  alertText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipOff: { opacity: 0.4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: hitTarget },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, minHeight: hitTarget },
  checkBox: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: t.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: t.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  input: {
    minHeight: hitTarget,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    color: t.text,
    fontSize: 15,
  },
}));
