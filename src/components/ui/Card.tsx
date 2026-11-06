import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, onDark, radius, spacing, withAlpha } from '@/theme';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Carte « verre » des écrans sombres : flou, voile blanc translucide, bordure
 * fine et filet d'accent vert en haut (même rendu que la carte du login web).
 */
export function Card({ children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.veil]} />
      <LinearGradient
        colors={['transparent', withAlpha(colors.green, 0.45), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: onDark.border,
    overflow: 'hidden',
  },
  veil: { backgroundColor: onDark.surface, pointerEvents: 'none' },
  accentLine: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: spacing['2xl'],
    right: spacing['2xl'],
    height: 1,
  },
  content: { padding: spacing['2xl'] },
});
