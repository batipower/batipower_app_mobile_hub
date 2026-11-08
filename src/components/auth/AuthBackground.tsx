import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, useTheme, withAlpha } from '@/theme';

/**
 * Fond « futuriste » des écrans de connexion, repris du layout `(auth)` du front web :
 * halos verts diffus, grille discrète, ligne de balayage et angles techniques.
 * Les animations sont coupées si l'utilisateur a activé « Réduire les animations ».
 */

interface Halo {
  id: string;
  /** Centre et rayons, en fraction de l'écran (équivalent du `radial-gradient` CSS). */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  alpha: number;
}

const HALOS: readonly Halo[] = [
  { id: 'halo1', cx: 0.15, cy: 0.4, rx: 0.9, ry: 0.7, color: '#94C83E', alpha: 0.07 },
  { id: 'halo2', cx: 0.85, cy: 0.25, rx: 0.7, ry: 0.9, color: '#94C83E', alpha: 0.05 },
  { id: 'halo3', cx: 0.55, cy: 0.85, rx: 0.8, ry: 0.6, color: '#64B450', alpha: 0.04 },
];

export function AuthBackground() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const t = useTheme();
  const isDark = t.scheme === 'dark';
  // En clair : vert de marque assombri (lisible sur fond clair) et halos un peu plus présents.
  const lineColor = isDark ? colors.green : t.accentText;
  const haloBoost = isDark ? 1 : 1.8;
  const [aurora] = useState(() => new Animated.Value(0));
  const [scan] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      aurora.setValue(1);
      scan.setValue(0);
      return;
    }
    const auroraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(aurora, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(aurora, {
          toValue: 0,
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const scanLoop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    auroraLoop.start();
    scanLoop.start();
    return () => {
      auroraLoop.stop();
      scanLoop.stop();
    };
  }, [reduceMotion, aurora, scan]);

  const corner = {
    position: 'absolute' as const,
    width: 28,
    height: 28,
    borderColor: withAlpha(lineColor, isDark ? 0.25 : 0.3),
  };
  const top = insets.top + 12;
  const bottom = insets.bottom + 12;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.black : t.bg }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: aurora.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) },
        ]}
      >
        <Svg width={width} height={height}>
          <Defs>
            {HALOS.map((halo) => (
              <RadialGradient
                key={halo.id}
                id={halo.id}
                gradientUnits="userSpaceOnUse"
                cx={halo.cx * width}
                cy={halo.cy * height}
                rx={halo.rx * width}
                ry={halo.ry * height}
              >
                <Stop offset="0" stopColor={halo.color} stopOpacity={halo.alpha * haloBoost} />
                <Stop offset="0.65" stopColor={halo.color} stopOpacity={0} />
              </RadialGradient>
            ))}
            <Pattern id="grid" width={60} height={60} patternUnits="userSpaceOnUse">
              <Path d="M60 0H0V60" stroke={lineColor} strokeWidth={1} fill="none" />
            </Pattern>
          </Defs>
          <Rect width={width} height={height} fill="url(#grid)" opacity={isDark ? 0.035 : 0.06} />
          {HALOS.map((halo) => (
            <Rect key={halo.id} width={width} height={height} fill={`url(#${halo.id})`} />
          ))}
        </Svg>
      </Animated.View>

      {/* Ligne de balayage horizontale */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            transform: [
              { translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [-4, height] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', withAlpha(lineColor, isDark ? 0.5 : 0.35), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Angles techniques */}
      <View style={[corner, { top, left: 12, borderLeftWidth: 1, borderTopWidth: 1 }]} />
      <View style={[corner, { top, right: 12, borderRightWidth: 1, borderTopWidth: 1 }]} />
      <View style={[corner, { bottom, left: 12, borderLeftWidth: 1, borderBottomWidth: 1 }]} />
      <View style={[corner, { bottom, right: 12, borderRightWidth: 1, borderBottomWidth: 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
