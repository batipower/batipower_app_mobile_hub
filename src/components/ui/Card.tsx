import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { makeStyles, onDark, radius, shadow, spacing, useTheme, withAlpha } from '@/theme';

type CardProps = {
  children: ReactNode;
  /**
   * `flat` (défaut) : carte du web, fond plein, bordure fine et ombre légère.
   * `glass` : carte translucide floutée, réservée aux écrans de connexion.
   */
  variant?: 'flat' | 'glass';
  style?: StyleProp<ViewStyle>;
  /** Surcharge du conteneur interne (marges intérieures par défaut : 16, ou 24 en `glass`). */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Carte Batipower : même rendu que `Card` de shadcn côté web (`rounded-lg border bg-card
 * shadow-bati-sm`). La variante `glass` reprend la carte translucide de la page de connexion
 * (flou, voile et filet d'accent vert en haut).
 */
export function Card({ children, variant = 'flat', style, contentStyle }: CardProps) {
  const styles = useStyles();
  const t = useTheme();

  if (variant === 'flat') {
    return (
      <View style={[styles.flat, style]}>
        <View style={[styles.flatContent, contentStyle]}>{children}</View>
      </View>
    );
  }

  const isDark = t.scheme === 'dark';

  // Sombre : verre dépoli translucide. Clair : carte blanche opaque, bordure et ombre
  // (le flou n'apporte rien sur un fond clair et dégrade le contraste).
  return (
    <View style={[styles.glass, !isDark && styles.glassLight, style]}>
      {isDark ? (
        <BlurView intensity={30} tint={t.blurTint} style={StyleSheet.absoluteFill} />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.veil,
          { backgroundColor: isDark ? onDark.surface : t.card },
        ]}
      />
      <LinearGradient
        colors={['transparent', withAlpha(t.accent, 0.45), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />
      <View style={[styles.glassContent, contentStyle]}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flat: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  flatContent: { padding: spacing.lg },
  glass: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    overflow: 'hidden',
  },
  glassLight: {
    // `overflow: hidden` supprimerait l'ombre sur iOS : le contenu reste de toute façon dans la carte.
    overflow: 'visible',
    backgroundColor: t.card,
    ...shadow.sm,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  veil: { pointerEvents: 'none', borderRadius: radius.xl },
  accentLine: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: spacing['2xl'],
    right: spacing['2xl'],
    height: 1,
  },
  glassContent: { padding: spacing['2xl'] },
}));
