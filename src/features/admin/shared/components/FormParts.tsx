import { useState, type ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, radius, spacing, typography, useTheme, withAlpha } from '@/theme';

import { SelectSheet, type SelectOption } from './SelectSheet';

/** Champ de formulaire titré (libellé en petites capitales, aide discrète dessous). */
export function Field({
  label,
  required,
  hint,
  warning,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string | null;
  warning?: string | null;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {warning ? <Text style={styles.warning}>{warning}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

type SelectFieldProps = {
  label: string;
  required?: boolean;
  hint?: string | null;
  warning?: string | null;
  /** Texte affiché dans le champ (libellé de la valeur choisie). */
  valueLabel: string;
  placeholder?: string;
  disabled?: boolean;
  sheetTitle?: string;
  options: SelectOption[];
  selected: string[];
  multiple?: boolean;
  searchable?: boolean;
  loading?: boolean;
  error?: unknown;
  noneLabel?: string;
  onToggle: (value: string) => void;
  onRetry?: () => void;
};

/** Champ à choix : une ligne qui ouvre une `SelectSheet` (choix simple ou multiple). */
export function SelectField({
  label,
  required,
  hint,
  warning,
  valueLabel,
  placeholder = 'Choisir',
  disabled,
  sheetTitle,
  options,
  selected,
  multiple,
  searchable,
  loading,
  error,
  noneLabel,
  onToggle,
  onRetry,
}: SelectFieldProps) {
  const styles = useStyles();
  const t = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Field label={label} required={required} hint={hint} warning={warning}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${valueLabel || placeholder}`}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.select, disabled && { opacity: 0.55 }]}
      >
        <Text
          style={[styles.selectText, !valueLabel && { color: t.textFaint }]}
          numberOfLines={2}
        >
          {valueLabel || placeholder}
        </Text>
        <ChevronDown size={16} color={t.textSubtle} />
      </Pressable>
      <SelectSheet
        visible={open}
        title={sheetTitle ?? label}
        options={options}
        selected={selected}
        multiple={multiple}
        searchable={searchable}
        loading={loading}
        error={error}
        noneLabel={noneLabel}
        onToggle={onToggle}
        onClose={() => setOpen(false)}
        onRetry={onRetry}
      />
    </Field>
  );
}

/** Ligne à interrupteur (compte actif, double authentification…). */
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.hint}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: t.accent, false: t.surfaceStrong }}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Encart d'information ou d'avertissement dans un formulaire. */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  const styles = useStyles();
  const t = useTheme();
  const color = tone === 'warning' ? t.warning : t.info;
  return (
    <View
      style={[
        styles.notice,
        { borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.1) },
      ]}
    >
      <Text style={[styles.noticeText, { color: tone === 'warning' ? t.warning : t.textMuted }]}>
        {children}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: spacing.sm },
  label: { ...typography.label, color: t.textMuted },
  required: { color: t.danger },
  hint: { fontSize: 12, lineHeight: 17, color: t.textSubtle },
  warning: { fontSize: 12, lineHeight: 17, color: t.warning },
  select: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  selectText: { flex: 1, fontSize: 15, color: t.text },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitTarget,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  notice: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  noticeText: { fontSize: 12, lineHeight: 17 },
}));
