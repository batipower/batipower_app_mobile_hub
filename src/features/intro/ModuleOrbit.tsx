import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { MODULE_ORDER, MODULES } from '@/modules/registry';
import type { BatipowerModule } from '@/types/user';

const CHIP = 46;
/** Inclinaison du plan de l'orbite, en radians. */
const TILT = (-14 * Math.PI) / 180;
const STEP = (2 * Math.PI) / MODULE_ORDER.length;

type ModuleOrbitProps = {
  /** Côté du carré de la scène : le centre de l'orbite en est le milieu. */
  stage: number;
  /** Rayon horizontal de l'orbite. */
  radius: number;
  /** Angle de l'orbite en degrés. */
  orbit: SharedValue<number>;
  /** Apparition des modules, de 0 (rien) à 1 (en orbite). */
  appear: SharedValue<number>;
  /** Plongée finale, de 0 à 1 : l'orbite s'élargit et s'efface. */
  dive: SharedValue<number>;
};

/**
 * Les modules de l'écosystème Batipower (`MODULES`) en orbite elliptique autour de l'éclair.
 * L'échelle, l'opacité et l'ordre d'empilement suivent la profondeur : les modules passant devant
 * recouvrent l'éclair (`zIndex` 2), ceux qui passent derrière se placent dessous (`zIndex` 0).
 * Rendu sous forme de pastilles absolues, à poser dans la scène à côté de l'éclair (`zIndex` 1).
 */
export function ModuleOrbit({ stage, radius, orbit, appear, dive }: ModuleOrbitProps) {
  return (
    <>
      {MODULE_ORDER.map((id, index) => (
        <OrbitChip
          key={id}
          id={id}
          index={index}
          stage={stage}
          radius={radius}
          orbit={orbit}
          appear={appear}
          dive={dive}
        />
      ))}
    </>
  );
}

type OrbitChipProps = ModuleOrbitProps & { id: BatipowerModule; index: number };

function OrbitChip({ id, index, stage, radius, orbit, appear, dive }: OrbitChipProps) {
  const meta = MODULES[id];
  const Icon = meta.icon;

  const style = useAnimatedStyle(() => {
    const angle = (orbit.value * Math.PI) / 180 + index * STEP;
    const front = (Math.sin(angle) + 1) / 2; // 0 : au fond, 1 : au premier plan
    const spread = appear.value * (1 + dive.value * 1.6);
    const ex = Math.cos(angle) * radius * spread;
    const ey = Math.sin(angle) * radius * 0.34 * spread;
    const x = ex * Math.cos(TILT) - ey * Math.sin(TILT);
    const y = ex * Math.sin(TILT) + ey * Math.cos(TILT);
    return {
      zIndex: front > 0.5 ? 2 : 0,
      opacity: appear.value * (0.35 + 0.65 * front) * (1 - Math.min(1, dive.value * 1.4)),
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: (0.55 + 0.45 * front) * (0.4 + 0.6 * appear.value) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.chip, { left: (stage - CHIP) / 2, top: (stage - CHIP) / 2 }, style]}
    >
      <LinearGradient
        colors={[meta.accent, `${meta.accent}B8`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}
      >
        <Icon size={22} color={meta.fg} strokeWidth={2.2} />
      </LinearGradient>
      <Text style={styles.label}>{meta.name}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { position: 'absolute', width: CHIP, alignItems: 'center', gap: 4 },
  tile: {
    width: CHIP,
    height: CHIP,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  label: {
    width: CHIP + 24,
    textAlign: 'center',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.85)',
  },
});
