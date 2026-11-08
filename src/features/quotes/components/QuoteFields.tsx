import type { ReactNode } from 'react';
import { Pressable, Switch, Text, TextInput, View, type TextInputProps } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, radius, spacing, typography, useTheme } from '@/theme';

type QuoteTextAreaProps = Omit<TextInputProps, 'style' | 'placeholderTextColor' | 'multiline'> & {
  label: string;
  minHeight?: number;
};

/** Zone de texte multiligne (notes, message au client, corps d'e-mail), au style de `TextField`. */
export function QuoteTextArea({ label, minHeight = 96, ...inputProps }: QuoteTextAreaProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline
        textAlignVertical="top"
        style={[styles.area, { minHeight }]}
        placeholderTextColor={t.textFaint}
        selectionColor={t.accentText}
        keyboardAppearance={t.scheme}
        accessibilityLabel={label}
        {...inputProps}
      />
    </View>
  );
}

type ToggleRowProps = {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** Interrupteur avec libellé et aide (transport offert, envoi d'e-mail…). */
export function ToggleRow({ label, hint, value, onValueChange, disabled }: ToggleRowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
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

type NavRowProps = {
  label: string;
  value?: string;
  hint?: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
};

/** Ligne tactile « libellé — valeur › » qui ouvre une feuille d'édition. */
export function NavRow({ label, value, hint, icon, onPress, disabled }: NavRowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.nav, pressed && styles.navPressed]}
    >
      {icon}
      <View style={styles.navText}>
        <Text style={styles.navLabel}>{label}</Text>
        {value ? (
          <Text style={styles.navValue} numberOfLines={2}>
            {value}
          </Text>
        ) : null}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {disabled ? null : <ChevronRight size={16} color={t.textSubtle} />}
    </Pressable>
  );
}

/** Ligne de montant « libellé ………… valeur » des totaux et des récapitulatifs. */
export function AmountRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'danger' | 'success' | 'muted';
}) {
  const styles = useStyles();
  const t = useTheme();
  const color = tone === 'danger' ? t.danger : tone === 'success' ? t.success : tone === 'muted' ? t.textMuted : t.text;
  return (
    <View style={styles.amount}>
      <Text style={[styles.amountLabel, strong && styles.amountStrong, tone === 'muted' && { color: t.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.amountValue, strong && styles.amountStrong, { color }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: spacing.sm },
  label: { ...typography.label, color: t.textMuted },
  area: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    color: t.text,
    fontSize: 15,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: hitTarget },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitTarget,
    paddingVertical: spacing.sm,
  },
  navPressed: { opacity: 0.6 },
  navText: { flex: 1, gap: 2 },
  navLabel: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  navValue: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  amount: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  amountLabel: { flex: 1, fontSize: fontSize.sm, color: t.textMuted },
  amountValue: { fontSize: fontSize.sm, fontWeight: '600' },
  amountStrong: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
}));
