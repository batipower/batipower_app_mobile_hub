import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Text, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { TextField } from '@/components/ui';
import { fontSize, makeStyles, spacing } from '@/theme';

type FormFieldProps<T extends FieldValues> = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'> & {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
};

/** Champ texte branché sur react-hook-form : erreur de validation affichée sous le champ. */
export function FormField<T extends FieldValues>({ control, name, label, hint, ...inputProps }: FormFieldProps<T>) {
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.wrap}>
          <TextField
            label={label}
            value={String(field.value ?? '')}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            {...inputProps}
          />
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      )}
    />
  );
}

/** Nombre décimal saisi avec virgule ou point ; `NaN` si invalide. */
export function parseDecimal(raw: string): number {
  return parseFloat(raw.trim().replace(/\s/g, '').replace(',', '.'));
}

export const isPositiveDecimal = (raw: string, max = 1_000_000): boolean => {
  const n = parseDecimal(raw);
  return Number.isFinite(n) && n > 0 && n <= max;
};

/** EAN-8, UPC-A (12), EAN-13 ou GTIN-14 : uniquement des chiffres. */
export const EAN_PATTERN = /^\d{8}$|^\d{12,14}$/;

const useStyles = makeStyles((t) => ({
  wrap: { gap: spacing.xs },
  hint: { fontSize: fontSize.xs, color: t.textMuted },
}));
