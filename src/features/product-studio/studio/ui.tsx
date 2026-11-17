import type { ReactNode, Ref } from 'react';
import { Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import type { TextInputHandle } from '@/components/ui';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';

import { visibleText } from '../domain/model';

/** Carte du Studio : conteneur autonome posé sur le fond de l'écran. */
export function StudioCard({
  children,
  style,
  tone,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'danger' | 'warning' | 'success';
}) {
  const styles = useStyles();
  const t = useTheme();
  const border = tone ? withAlpha(t[tone], 0.5) : undefined;
  return (
    <View
      style={[
        styles.card,
        border ? { borderColor: border, backgroundColor: withAlpha(t[tone!], 0.08) } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StudioHeading({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.heading}>{children}</Text>;
}

type StudioInputProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  ref?: Ref<TextInputHandle>;
  mono?: boolean;
  minHeight?: number;
};

/** Champ de saisie du Studio (une ou plusieurs lignes). */
export function StudioInput({
  ref,
  mono = false,
  minHeight,
  multiline,
  editable = true,
  ...props
}: StudioInputProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <TextInput
      ref={ref}
      multiline={multiline}
      editable={editable}
      placeholderTextColor={t.textFaint}
      selectionColor={t.accentText}
      keyboardAppearance={t.scheme}
      style={[
        styles.input,
        mono && { fontFamily: monoFontFamily, fontSize: fontSize.xs },
        multiline ? { minHeight: minHeight ?? 96, textAlignVertical: 'top' } : null,
        !editable && { opacity: 0.6 },
      ]}
      {...props}
    />
  );
}

/** Jauge de longueur d'un champ (texte visible, balises exclues). */
export function CharCount({
  value,
  max,
  min,
  hint,
}: {
  value: string;
  max: number;
  min?: number;
  hint?: string;
}) {
  const styles = useStyles();
  const t = useTheme();
  const length = visibleText(value).length;
  const over = length > max;
  const under = min != null && length > 0 && length < min;
  const ok = !over && !under && length > 0;
  const percent = Math.min(100, Math.round((length / Math.max(max, 1)) * 100));
  const color = over ? t.danger : under ? t.warning : ok ? t.success : t.textFaint;
  return (
    <View style={styles.charCount}>
      <View style={styles.track}>
        <View
          style={{
            height: '100%',
            width: `${length === 0 ? 0 : Math.max(percent, 4)}%`,
            backgroundColor: color,
          }}
        />
      </View>
      <Text style={[styles.charText, { color: over || under ? t.danger : ok ? t.success : t.textSubtle }]}>
        {length} / {max}
        {min != null ? ` · min ${min}` : ''}
        {over ? ' · trop long' : under ? ' · trop court' : ''}
        {hint ? ` · ${hint}` : ''}
      </Text>
    </View>
  );
}

/** Barre de progression fine. */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.track}>
      <View
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, value))}%`,
          backgroundColor: color ?? t.accent,
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  heading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.borderStrong,
    backgroundColor: t.surface,
    color: t.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  charCount: { gap: 4 },
  track: {
    height: 4,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: t.surfaceStrong,
  },
  charText: { fontSize: 11, fontVariant: ['tabular-nums'] },
}));
