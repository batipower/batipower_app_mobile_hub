import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BoltMark } from '@/components/brand/BoltMark';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, withAlpha } from '@/theme';

/** Diamètre du disque central. */
export const CENTER_BUTTON_SIZE = 62;

type CenterBoltButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Bouton central de la barre d'onglets : disque sombre surélevé portant l'éclair Batipower, avec
 * un halo vert qui respire (figé si « Réduire les animations » est actif).
 */
export function CenterBoltButton({ onPress, accessibilityLabel }: CenterBoltButtonProps) {
  const reduceMotion = useReduceMotion();
  const press = useSharedValue(1);
  const halo = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(halo);
      halo.set(0);
      return;
    }
    halo.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(halo);
  }, [reduceMotion, halo]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - halo.value) * 0.45,
    transform: [{ scale: 1 + halo.value * 0.55 }],
  }));
  const diskStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const boltStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + flash.value * 0.18 }, { rotate: `${flash.value * -8}deg` }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPressIn={() => {
        press.set(withSpring(0.9, { damping: 14, stiffness: 320 }));
      }}
      onPressOut={() => {
        press.set(withSpring(1, { damping: 10, stiffness: 240 }));
      }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        flash.set(
          withSequence(
            withTiming(1, { duration: 110 }),
            withSpring(0, { damping: 8, stiffness: 180 }),
          ),
        );
        onPress();
      }}
      style={styles.pressable}
    >
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      <Animated.View style={[styles.disk, diskStyle]}>
        <LinearGradient
          colors={[colors.gray700, colors.gray900, colors.black]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.gloss} />
        <Animated.View style={boltStyle}>
          <BoltMark size={32} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    ...StyleSheet.absoluteFill,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: withAlpha(colors.green, 0.6),
  },
  disk: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: withAlpha(colors.green, 0.6),
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: CENTER_BUTTON_SIZE * 0.45,
    borderBottomLeftRadius: CENTER_BUTTON_SIZE,
    borderBottomRightRadius: CENTER_BUTTON_SIZE,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
