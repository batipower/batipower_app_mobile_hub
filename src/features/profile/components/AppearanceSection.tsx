import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react-native';

import { DetailSection } from '@/components/ui';
import {
  darkTheme,
  fontSize,
  lightTheme,
  makeStyles,
  radius,
  spacing,
  THEME_PREFERENCES,
  useTheme,
  useThemePreference,
  withAlpha,
  type Theme,
  type ThemePreference,
} from '@/theme';

type Option = {
  label: string;
  hint: string;
  icon: LucideIcon;
};

const OPTIONS: Record<ThemePreference, Option> = {
  dark: { label: 'Sombre', hint: 'Fond sombre, reposant en faible luminosité.', icon: Moon },
  light: { label: 'Clair', hint: 'Fond clair, plus lisible en plein jour.', icon: Sun },
  system: {
    label: 'Auto',
    hint: 'Suit automatiquement le réglage de votre iPhone.',
    icon: SunMoon,
  },
};

/**
 * Choix de l'apparence de l'app (sombre, clair, auto) depuis le profil. Le choix est
 * appliqué tout de suite et conservé sur l'appareil ; l'écran de connexion reste sombre.
 */
export function AppearanceSection() {
  const styles = useStyles();
  const t = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <DetailSection title="Apparence">
      <View style={styles.options} accessibilityRole="radiogroup">
        {THEME_PREFERENCES.map((key) => {
          const option = OPTIONS[key];
          const selected = key === preference;
          const Icon = option.icon;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityHint={option.hint}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => {
                if (selected) return;
                void Haptics.selectionAsync().catch(() => undefined);
                setPreference(key);
              }}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && !selected && styles.optionPressed,
              ]}
            >
              <Preview preference={key} />
              <View style={styles.optionLabel}>
                <Icon size={14} color={selected ? t.accentText : t.textMuted} />
                <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                  {option.label}
                </Text>
              </View>
              {selected ? (
                <View style={styles.check}>
                  <Check size={11} color={t.onAccent} strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{OPTIONS[preference].hint}</Text>
    </DetailSection>
  );
}

/** Aperçu miniature : un faux écran aux couleurs du thème (moitié-moitié pour l'auto). */
function Preview({ preference }: { preference: ThemePreference }) {
  return (
    <View
      style={previewStyles.frame}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {preference === 'system' ? (
        <>
          <MiniScreen theme={darkTheme} style={previewStyles.half} />
          <MiniScreen theme={lightTheme} style={previewStyles.half} />
        </>
      ) : (
        <MiniScreen
          theme={preference === 'dark' ? darkTheme : lightTheme}
          style={previewStyles.half}
        />
      )}
    </View>
  );
}

function MiniScreen({ theme, style }: { theme: Theme; style: StyleProp<ViewStyle> }) {
  return (
    <View style={[previewStyles.screen, { backgroundColor: theme.bg }, style]}>
      <View style={[previewStyles.title, { backgroundColor: theme.text }]} />
      <View
        style={[
          previewStyles.card,
          { backgroundColor: theme.card, borderColor: theme.borderStrong },
        ]}
      >
        <View style={[previewStyles.accent, { backgroundColor: theme.accent }]} />
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  frame: {
    height: 52,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(128,128,128,0.35)',
  },
  half: { flex: 1 },
  screen: { justifyContent: 'center', gap: 5, paddingHorizontal: 7 },
  title: { height: 5, width: '65%', borderRadius: 3, opacity: 0.85 },
  card: {
    height: 16,
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  accent: { height: 4, width: '50%', borderRadius: 2 },
});

const useStyles = makeStyles((t) => ({
  options: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  optionSelected: {
    borderColor: t.accent,
    backgroundColor: withAlpha(t.accent, 0.1),
  },
  optionPressed: { backgroundColor: t.surfaceStrong },
  optionLabel: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  label: { flexShrink: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.textMuted },
  labelSelected: { color: t.text },
  check: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: t.accent,
  },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
