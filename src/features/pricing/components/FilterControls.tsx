import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';

import { FilterPill } from '@/components/sheet/FilterPill';

/** Étiquette + contrôle, empilés. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

type TriStateFieldProps = {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  /** Libellés des trois états : neutre, oui, non. */
  labels?: [string, string, string];
};

/** Filtre à trois états (indifférent / oui / non) sur un booléen nullable. */
export function TriStateField({
  label,
  value,
  onChange,
  labels = ['Tous', 'Oui', 'Non'],
}: TriStateFieldProps) {
  const current = value === null ? 'all' : value ? 'yes' : 'no';
  return (
    <Field label={label}>
      <SegmentedControl
        segments={[
          { key: 'all', label: labels[0] },
          { key: 'yes', label: labels[1] },
          { key: 'no', label: labels[2] },
        ]}
        value={current}
        onChange={(key) => onChange(key === 'all' ? null : key === 'yes')}
      />
    </Field>
  );
}

type BuyBoxStateFieldProps = {
  label: string;
  value: 'all' | 'true' | 'false';
  onChange: (value: 'all' | 'true' | 'false') => void;
  labels?: [string, string, string];
};

/** Même contrôle pour les états `all | true | false` (BuyBox, dépréciation). */
export function StateField({
  label,
  value,
  onChange,
  labels = ['Tous', 'Gagnée', 'Perdue'],
}: BuyBoxStateFieldProps) {
  return (
    <Field label={label}>
      <SegmentedControl
        segments={[
          { key: 'all', label: labels[0] },
          { key: 'true', label: labels[1] },
          { key: 'false', label: labels[2] },
        ]}
        value={value}
        onChange={onChange}
      />
    </Field>
  );
}

type ChoiceFieldProps<T extends string | number> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Choix unique parmi des puces qui passent à la ligne. */
export function ChoiceField<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: ChoiceFieldProps<T>) {
  const styles = useStyles();
  return (
    <Field label={label}>
      <View style={styles.wrap}>
        {options.map((option) => (
          <FilterPill
            key={String(option.value)}
            label={option.label}
            state={option.value === value ? 'on' : 'off'}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </Field>
  );
}

type MultiChoiceFieldProps = {
  label: string;
  options: readonly { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
};

/** Choix multiple : une puce par option, appui pour ajouter ou retirer. */
export function MultiChoiceField({ label, options, values, onChange }: MultiChoiceFieldProps) {
  const styles = useStyles();
  return (
    <Field label={label}>
      <View style={styles.wrap}>
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <FilterPill
              key={option.value}
              label={option.label}
              state={selected ? 'on' : 'off'}
              onPress={() =>
                onChange(
                  selected ? values.filter((v) => v !== option.value) : [...values, option.value],
                )
              }
            />
          );
        })}
      </View>
    </Field>
  );
}

/** Ligne qui ouvre une feuille de choix, avec la valeur courante à droite. */
export function LinkRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
    >
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.linkValue} numberOfLines={1}>
        {value}
      </Text>
      <ChevronRight size={16} color={t.textFaint} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  linkPressed: { backgroundColor: t.surfaceStrong },
  linkLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  linkValue: { flex: 1, textAlign: 'right', fontSize: fontSize.sm, color: t.textMuted },
}));
