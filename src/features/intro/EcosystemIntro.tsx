import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BoltMark } from '@/components/brand/BoltMark';
import { colors, withAlpha } from '@/theme';

import { Bolt3D } from './Bolt3D';
import { ModuleOrbit } from './ModuleOrbit';

type EcosystemIntroProps = {
  /** La session est vérifiée : l'intro peut se terminer. */
  ready: boolean;
  /** Premier rendu : le splash natif peut être retiré, l'intro prend le relais. */
  onReady: () => void;
  /** Fin de l'animation : l'overlay peut être démonté. */
  onDone: () => void;
};

/** Instant (ms) où l'éclair « frappe » : flash, ondes de choc et haptique. */
const IMPACT_AT = 700;
/** Durée minimale avant la plongée finale, quand la session est déjà prête. */
const HOLD_UNTIL = 2100;
/** Plafond de sécurité : au-delà, on sort de l'intro même si la session n'est pas vérifiée. */
const MAX_WAIT = 7000;

const BG_TOP = '#0A0E13';
const WORDMARK = 'BATIPOWER';
const GREEN_FROM = 4; // « POWER » en vert à partir de la 5e lettre

/**
 * Animation d'entrée dans l'écosystème Batipower, jouée une fois à chaque lancement à froid :
 * l'éclair 3D surgit en rotation, frappe (flash, ondes de choc), les modules se mettent en orbite,
 * le nom se compose, puis la « caméra » plonge dans l'éclair pour révéler l'app. Un appui passe
 * l'animation. Avec « Réduire les animations », seul un fondu du logo est joué.
 *
 * Le fond reprend celui du splash natif (`#131921`) pour un relais sans à-coup.
 */
export function EcosystemIntro(props: EcosystemIntroProps) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => mounted && setReduceMotion(enabled))
      .catch(() => mounted && setReduceMotion(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View
      style={styles.root}
      onLayout={props.onReady}
      accessibilityLabel="Batipower Pro"
      accessible={reduceMotion === null}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={[BG_TOP, colors.black, BG_TOP]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {reduceMotion === null ? null : reduceMotion ? (
        <ReducedIntro ready={props.ready} onDone={props.onDone} />
      ) : (
        <FullIntro ready={props.ready} onDone={props.onDone} />
      )}
    </View>
  );
}

type Phase = Pick<EcosystemIntroProps, 'ready' | 'onDone'>;

/** Temps minimal + fin de chargement + appui : décide du moment de sortie. */
function useExit(ready: boolean, holdMs: number) {
  const [held, setHeld] = useState(false);
  const [forced, setForced] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setHeld(true), holdMs);
    const cap = setTimeout(() => setForced(true), MAX_WAIT);
    return () => {
      clearTimeout(hold);
      clearTimeout(cap);
    };
  }, [holdMs]);

  return { exiting: skipped || forced || (held && ready), skipped, skip: () => setSkipped(true) };
}

function FullIntro({ ready, onDone }: Phase) {
  const { width } = useWindowDimensions();
  const stage = Math.min(width, 420);
  const logo = Math.min(stage * 0.46, 190);

  const entry = useSharedValue(0);
  const arcs = useSharedValue(0);
  const phase = useSharedValue(0);
  const impact = useSharedValue(0);
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);
  const orbitIn = useSharedValue(0);
  const orbit = useSharedValue(0);
  const word = useSharedValue(0);
  const pro = useSharedValue(0);
  const sub = useSharedValue(0);
  const dive = useSharedValue(0);

  const { exiting, skipped, skip } = useExit(ready, HOLD_UNTIL);

  useEffect(() => {
    const out = Easing.out(Easing.cubic);
    entry.set(withTiming(1, { duration: 800, easing: Easing.out(Easing.back(0.9)) }));
    arcs.set(withDelay(250, withTiming(1, { duration: 650, easing: out })));
    phase.set(withRepeat(withTiming(2 * Math.PI, { duration: 3400, easing: Easing.linear }), -1));
    impact.set(
      withDelay(
        IMPACT_AT,
        withSequence(
          withTiming(1, { duration: 140 }),
          withTiming(0.4, { duration: 800, easing: Easing.out(Easing.quad) }),
        ),
      ),
    );
    ringA.set(withDelay(IMPACT_AT, withTiming(1, { duration: 1100, easing: out })));
    ringB.set(withDelay(IMPACT_AT + 160, withTiming(1, { duration: 1100, easing: out })));
    orbitIn.set(withDelay(950, withTiming(1, { duration: 850, easing: out })));
    orbit.set(
      withDelay(950, withRepeat(withTiming(360, { duration: 5200, easing: Easing.linear }), -1)),
    );
    word.set(withDelay(1050, withTiming(1, { duration: 900, easing: out })));
    pro.set(withDelay(1650, withSpring(1, { damping: 11, stiffness: 160 })));
    sub.set(withDelay(1800, withTiming(1, { duration: 500 })));

    const haptic = setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    }, IMPACT_AT);

    return () => {
      clearTimeout(haptic);
      [entry, arcs, phase, impact, ringA, ringB, orbitIn, orbit, word, pro, sub].forEach((value) =>
        cancelAnimation(value),
      );
    };
  }, [entry, arcs, phase, impact, ringA, ringB, orbitIn, orbit, word, pro, sub]);

  useEffect(() => {
    if (!exiting) return;
    dive.set(
      withTiming(
        1,
        { duration: skipped ? 320 : 650, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) scheduleOnRN(onDone);
        },
      ),
    );
  }, [exiting, skipped, dive, onDone]);

  // Entrée : l'éclair arrive de profondeur en tournant, puis oscille doucement (effet 3D continu).
  const rotateY = useDerivedValue(
    () =>
      (1 - entry.value) * 150 +
      Math.sin(phase.value) * 18 * Math.min(entry.value, 1) * (1 - dive.value),
  );
  const rotateX = useDerivedValue(
    () => 12 * entry.value + Math.cos(phase.value) * 5 * Math.min(entry.value, 1),
  );

  const boltStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, entry.value * 3),
    transform: [{ scale: (0.45 + 0.55 * entry.value) * (1 + dive.value * dive.value * 6) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: impact.value * (1 - dive.value * 0.7),
    transform: [{ scale: 0.9 + impact.value * 0.25 + dive.value * 2 }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dive.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: dive.value * 30 }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dive.value, [0.55, 1], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={skip}
      accessibilityRole="button"
      accessibilityLabel="Passer l'animation d'introduction"
    >
      <Animated.View style={[styles.center, overlayStyle]}>
        <View style={{ width: stage, height: stage }}>
          <Shockwave progress={ringA} size={logo * 1.5} stage={stage} />
          <Shockwave progress={ringB} size={logo * 1.5} stage={stage} />

          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { left: 0, top: 0, width: stage, height: stage }, glowStyle]}
          >
            <Svg width={stage} height={stage}>
              <Defs>
                <RadialGradient id="intro-glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={colors.green} stopOpacity={0.5} />
                  <Stop offset="0.45" stopColor={colors.green} stopOpacity={0.14} />
                  <Stop offset="1" stopColor={colors.green} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={stage} height={stage} fill="url(#intro-glow)" />
            </Svg>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.bolt,
              { left: (stage - logo) / 2, top: (stage - logo) / 2, zIndex: 1 },
              boltStyle,
            ]}
          >
            <Bolt3D size={logo} rotateY={rotateY} rotateX={rotateX} arcs={arcs} />
          </Animated.View>

          <ModuleOrbit
            stage={stage}
            radius={stage * 0.4}
            orbit={orbit}
            appear={orbitIn}
            dive={dive}
          />
        </View>

        <Animated.View style={[styles.wordmark, { marginTop: -stage * 0.1 }, wordmarkStyle]}>
          <View style={styles.letters}>
            {WORDMARK.split('').map((char, index) => (
              <Letter
                key={`${char}-${index}`}
                char={char}
                index={index}
                total={WORDMARK.length}
                progress={word}
                accent={index >= GREEN_FROM}
              />
            ))}
          </View>
          <ProBadge progress={pro} />
          <SubTitle progress={sub} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function Shockwave({
  progress,
  size,
  stage,
}: {
  progress: SharedValue<number>;
  size: number;
  stage: number;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value > 0 ? (1 - progress.value) * 0.55 : 0,
    transform: [{ scale: 0.4 + progress.value * 2.6 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: (stage - size) / 2,
          top: (stage - size) / 2,
        },
        style,
      ]}
    />
  );
}

function Letter({
  char,
  index,
  total,
  progress,
  accent,
}: {
  char: string;
  index: number;
  total: number;
  progress: SharedValue<number>;
  accent: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const p = interpolate(
      progress.value * (total + 4) - index,
      [0, 4],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * 16 }, { scale: 0.8 + 0.2 * p }],
    };
  });
  return (
    <Animated.Text style={[styles.letter, accent && styles.letterAccent, style]}>
      {char}
    </Animated.Text>
  );
}

function ProBadge({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.5),
    transform: [{ scale: 0.6 + 0.4 * progress.value }],
  }));
  return (
    <Animated.View style={[styles.pro, style]}>
      <Text style={styles.proText}>PRO</Text>
    </Animated.View>
  );
}

function SubTitle({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));
  return <Animated.Text style={[styles.sub, style]}>{`ENTRÉE DANS L'ÉCOSYSTÈME`}</Animated.Text>;
}

/** « Réduire les animations » : fondu du seul éclair, sans mouvement ni haptique. */
function ReducedIntro({ ready, onDone }: Phase) {
  const opacity = useSharedValue(0);
  const { exiting, skipped, skip } = useExit(ready, 700);

  useEffect(() => {
    opacity.set(withTiming(1, { duration: 300 }));
    return () => cancelAnimation(opacity);
  }, [opacity]);

  useEffect(() => {
    if (!exiting) return;
    opacity.set(
      withTiming(0, { duration: skipped ? 150 : 300 }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [exiting, skipped, opacity, onDone]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={skip}
      accessibilityRole="button"
      accessibilityLabel="Passer l'introduction"
    >
      <Animated.View style={[styles.center, style]}>
        <BoltMark size={96} />
        <Text style={styles.reducedName}>BATIPOWER PRO</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: colors.black,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  bolt: { position: 'absolute' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: withAlpha(colors.green, 0.9),
  },
  wordmark: { alignItems: 'center', gap: 12 },
  letters: { flexDirection: 'row' },
  letter: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 5,
    color: colors.white,
  },
  letterAccent: { color: colors.green },
  pro: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: withAlpha(colors.green, 0.14),
  },
  proText: { fontSize: 13, fontWeight: '800', letterSpacing: 4, color: colors.green },
  sub: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.2,
    color: withAlpha(colors.white, 0.55),
  },
  reducedName: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.white,
  },
});
