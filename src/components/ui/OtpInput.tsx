import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  editable?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
};

/**
 * Saisie d'un code à N chiffres.
 *
 * Un seul `TextInput` invisible reçoit la saisie (clavier numérique, collage,
 * suggestion de code iOS via `oneTimeCode`) ; les cases affichées ne sont que
 * le reflet de sa valeur. Plus fiable que N champs séparés pour le collage et
 * l'autofill.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  editable = true,
  hasError = false,
  autoFocus = false,
}: OtpInputProps) {
  const styles = useStyles();
  const t = useTheme();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {Array.from({ length }, (_, index) => {
          const digit = value[index] ?? '';
          const isActive = focused && editable && index === activeIndex;
          return (
            <View
              key={index}
              style={[
                styles.box,
                digit ? styles.boxFilled : undefined,
                isActive && styles.boxActive,
                hasError && styles.boxError,
              ]}
            >
              <Text style={styles.digit}>{digit}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        editable={editable}
        caretHidden
        keyboardAppearance={t.scheme}
        accessibilityLabel={`Code de vérification à ${length} chiffres`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { position: 'relative' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 10, pointerEvents: 'none' },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.borderStrong,
    backgroundColor: t.surface,
  },
  boxFilled: { borderColor: withAlpha(t.accent, 0.3) },
  boxActive: {
    borderColor: withAlpha(t.accent, 0.8),
    backgroundColor: withAlpha(t.accent, 0.06),
  },
  boxError: { borderColor: withAlpha(t.danger, 0.7) },
  digit: { fontSize: 22, fontWeight: '700', color: t.text },
  // Couvre toute la rangée : un toucher n'importe où donne le focus au champ réel.
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    paddingHorizontal: spacing.xs,
  },
}));
