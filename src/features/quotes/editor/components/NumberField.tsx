import { useState } from 'react';

import { TextField } from '@/components/ui';

/** « 12,5 » ou « 12.5 » → 12.5 ; `null` si la saisie n'est pas un nombre. */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  if (normalized === '' || normalized === '-' || normalized === '.') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function format(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '';
  const fixed = decimals > 0 ? String(Math.round(value * 10 ** decimals) / 10 ** decimals) : String(Math.round(value));
  return fixed.replace('.', ',');
}

type NumberFieldProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  /** Nombre de décimales conservées à l'affichage (0 : entier). */
  decimals?: number;
  suffix?: string;
  min?: number;
  max?: number;
  editable?: boolean;
  error?: string;
};

/**
 * Champ numérique à saisie libre : le texte tapé (virgule ou point) est conservé tel quel
 * pendant la frappe, la valeur n'est remontée que lorsqu'elle est valide, et le champ se
 * resynchronise quand la valeur change de l'extérieur (bouton « catalogue », stepper…).
 */
export function NumberField({
  label,
  value,
  onValueChange,
  decimals = 2,
  suffix,
  min,
  max,
  editable = true,
  error,
}: NumberFieldProps) {
  const [text, setText] = useState(() => format(value, decimals));

  // Resynchronisation sur changement externe de la valeur (ajustée pendant le rendu).
  const [previous, setPrevious] = useState(value);
  if (value !== previous) {
    setPrevious(value);
    const parsed = parseDecimal(text);
    if (parsed === null || Math.abs(parsed - value) > 10 ** -(decimals + 1)) {
      setText(format(value, decimals));
    }
  }

  return (
    <TextField
      label={suffix ? `${label} (${suffix})` : label}
      value={text}
      keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
      editable={editable}
      error={error}
      onChangeText={(next) => {
        setText(next);
        const parsed = parseDecimal(next);
        if (parsed === null) return;
        let bounded = parsed;
        if (min !== undefined) bounded = Math.max(min, bounded);
        if (max !== undefined) bounded = Math.min(max, bounded);
        onValueChange(bounded);
      }}
      onBlur={() => setText(format(value, decimals))}
    />
  );
}
