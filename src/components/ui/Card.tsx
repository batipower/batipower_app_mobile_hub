import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Surcharge du conteneur interne (marges intérieures par défaut : 24). */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Carte « verre » : flou, voile translucide (blanc plein en thème clair), bordure fine
 * et filet d'accent vert en haut (même rendu que la carte du login web).
 */
export function Card({ children, style, contentStyle }: CardProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={[styles.card, style]}>
      <BlurView intensity={30} tint={t.blurTint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.veil]} />
      <LinearGradient
        colors={['transparent', withAlpha(t.accent, 0.45), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    overflow: 'hidden',
  },
  veil: { backgroundColor: t.card, pointerEvents: 'none' },
  accentLine: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: spacing['2xl'],
    right: spacing['2xl'],
    height: 1,
  },
  content: { padding: spacing['2xl'] },
}));
