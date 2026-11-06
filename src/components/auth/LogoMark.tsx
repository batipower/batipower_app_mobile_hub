import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, withAlpha } from '@/theme';

type LogoMarkProps = {
  size?: number;
  /** Halo vert qui « respire » derrière le logo (désactivé si « Réduire les animations »). */
  glow?: boolean;
};

/** Logo Batipower sur tuile blanche, avec halo vert : reprise du login web. */
export function LogoMark({ size = 64, glow = true }: LogoMarkProps) {
  const reduceMotion = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!glow || reduceMotion) {
      pulse.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, reduceMotion, pulse]);

  const radius = size * 0.25;

  return (
    <View style={{ width: size, height: size }} accessibilityLabel="Batipower" accessible>
      {glow ? (
        <Animated.View
          style={[
            styles.glow,
            {
              borderRadius: radius,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1.6] }) },
              ],
            },
          ]}
        />
      ) : null}
      <View style={[styles.tile, { borderRadius: radius }]}>
        <Image
          source={require('../../../assets/logo-batipower.png')}
          style={{ width: size * 0.69, height: size * 0.69 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
    backgroundColor: withAlpha(colors.green, 0.22),
  },
  tile: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: colors.green,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
});
