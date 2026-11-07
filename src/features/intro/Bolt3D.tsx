import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BoltMark, LOGO_SIZE } from '@/components/brand/BoltMark';
import { colors } from '@/theme';

/** Nombre de couches empilées pour donner de l'épaisseur à l'éclair. */
const LAYERS = 10;
/** Position de la couche des arcs dans la profondeur de l'éclair. */
const ARCS_DEPTH = 4;

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Arcs du logo (`assets/logo-batipower.png`), mesurés sur l'image : cercle de centre (127, 125,5)
// et de rayon 109 dans le repère 256 × 256, tracé de part et d'autre de l'éclair.
const ARC_CENTER = { x: 127, y: 125.5 };
const ARC_RADIUS = 109;
const ARC_STROKE = 15;

function arcPoint(angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: ARC_CENTER.x + ARC_RADIUS * Math.cos(a),
    y: ARC_CENTER.y + ARC_RADIUS * Math.sin(a),
  };
}

function arcPath(from: number, to: number) {
  const start = arcPoint(from);
  const end = arcPoint(to);
  return `M ${start.x} ${start.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

const ARCS = [
  { d: arcPath(118, 257), length: (ARC_RADIUS * (257 - 118) * Math.PI) / 180 },
  { d: arcPath(-63, 78), length: (ARC_RADIUS * (78 + 63) * Math.PI) / 180 },
] as const;

/** Mélange linéaire de deux couleurs `#RRGGBB`. */
function mix(from: string, to: string, ratio: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - ratio) + ((b >> shift) & 255) * ratio);
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

type Bolt3DProps = {
  /** Côté du carré du logo, en points. */
  size: number;
  /** Rotation autour de l'axe vertical, en degrés. */
  rotateY: SharedValue<number>;
  /** Inclinaison avant / arrière, en degrés. */
  rotateX: SharedValue<number>;
  /** Progression du tracé des arcs, de 0 (invisibles) à 1 (complets). */
  arcs: SharedValue<number>;
};

/**
 * Logo Batipower en pseudo-3D : l'éclair est une pile de couches de plus en plus sombres, chacune
 * décalée à l'écran selon l'angle de rotation (une profondeur `d` projetée sous une rotation
 * donne un déplacement de `-d·sin(θ)` en x et `d·sin(φ)` en y). Les arcs du logo se tracent à
 * mi-profondeur. React Native n'a pas de `preserve-3d` : chaque couche porte donc sa propre
 * transformation, toutes calculées à partir des deux mêmes valeurs partagées.
 */
export function Bolt3D({ size, rotateY, rotateX, arcs }: Bolt3DProps) {
  const step = size * 0.013;

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: LAYERS }, (_, index) => {
        const depth = LAYERS - 1 - index; // la couche du fond est dessinée en premier
        const front = depth === 0;
        return (
          <View key={depth} style={StyleSheet.absoluteFill}>
            <Layer
              depth={depth * step}
              size={size}
              rotateY={rotateY}
              rotateX={rotateX}
              depthRatio={depth / (LAYERS - 1)}
              front={front}
            />
            {depth === ARCS_DEPTH ? (
              <ArcsLayer
                depth={depth * step}
                size={size}
                rotateY={rotateY}
                rotateX={rotateX}
                arcs={arcs}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type LayerProps = {
  depth: number;
  size: number;
  rotateY: SharedValue<number>;
  rotateX: SharedValue<number>;
  depthRatio: number;
  front: boolean;
};

function useLayerTransform(
  depth: number,
  size: number,
  rotateY: SharedValue<number>,
  rotateX: SharedValue<number>,
) {
  return useAnimatedStyle(() => {
    const y = (rotateY.value * Math.PI) / 180;
    const x = (rotateX.value * Math.PI) / 180;
    return {
      transform: [
        { translateX: -depth * Math.sin(y) },
        { translateY: depth * Math.sin(x) },
        { perspective: size * 5 },
        { rotateY: `${rotateY.value}deg` },
        { rotateX: `${rotateX.value}deg` },
      ],
    };
  });
}

function Layer({ depth, size, rotateY, rotateX, depthRatio, front }: LayerProps) {
  const style = useLayerTransform(depth, size, rotateY, rotateX);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {front ? (
        <BoltMark size={size} frame="logo" />
      ) : (
        <BoltMark
          size={size}
          frame="logo"
          color={mix(colors.greenDark, '#16260A', Math.min(1, depthRatio * 1.15))}
        />
      )}
    </Animated.View>
  );
}

function ArcsLayer({
  depth,
  size,
  rotateY,
  rotateX,
  arcs,
}: {
  depth: number;
  size: number;
  rotateY: SharedValue<number>;
  rotateX: SharedValue<number>;
  arcs: SharedValue<number>;
}) {
  const style = useLayerTransform(depth, size, rotateY, rotateX);
  const first = useAnimatedProps(() => ({ strokeDashoffset: ARCS[0].length * (1 - arcs.value) }));
  const second = useAnimatedProps(() => ({ strokeDashoffset: ARCS[1].length * (1 - arcs.value) }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`}>
        {ARCS.map((arc, index) => (
          <AnimatedPath
            key={arc.d}
            d={arc.d}
            fill="none"
            stroke={colors.greenDark}
            strokeWidth={ARC_STROKE}
            strokeLinecap="round"
            strokeDasharray={[arc.length, arc.length]}
            animatedProps={index === 0 ? first : second}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
