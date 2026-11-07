import { useId } from 'react';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Contour de l'éclair du logo Batipower (`assets/logo-batipower.png`), sans les deux arcs, dans
 * le repère 256 × 256 du logo. Le trait de même couleur, arrondi, adoucit les angles.
 */
export const BOLT_POINTS = '155,5 39,145 128,150 100,251 217,110 130,106';

/** Épaisseur du trait d'adoucissement des angles, dans le repère du logo. */
export const BOLT_STROKE = 9;

/** Zone utile de l'éclair dans le repère du logo (x, y, largeur, hauteur) : sert au recadrage. */
const BOLT_VIEWBOX = { x: 26, y: -4, width: 202, height: 264 };

/** Côté du repère carré du logo. */
export const LOGO_SIZE = 256;

/** Largeur / hauteur de l'éclair recadré. */
export const BOLT_ASPECT = BOLT_VIEWBOX.width / BOLT_VIEWBOX.height;

type BoltMarkProps = {
  /** Hauteur de l'éclair en points ; la largeur suit les proportions du logo. */
  size?: number;
  /** Couleur unie : remplace le dégradé de marque. */
  color?: string;
  /** Dégradé vert de marque (ignoré si `color` est fournie). */
  gradient?: boolean;
  /** Opacité du tracé, utile pour les couches d'ombre de l'éclair 3D. */
  opacity?: number;
  /**
   * `crop` (défaut) : recadré sur l'éclair. `logo` : carré de `size` dans le repère complet du
   * logo, pour superposer l'éclair à d'autres tracés du logo (les arcs de l'intro).
   */
  frame?: 'crop' | 'logo';
};

/** L'éclair Batipower seul, vectoriel, en dégradé vert de marque ou en couleur unie. */
export function BoltMark({
  size = 24,
  color,
  gradient = true,
  opacity = 1,
  frame = 'crop',
}: BoltMarkProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `bolt-${id}`;
  const useGradient = gradient && !color;
  const fill = useGradient ? `url(#${gradientId})` : (color ?? colors.green);
  const { x, y, width, height } = BOLT_VIEWBOX;
  const logoFrame = frame === 'logo';

  return (
    <Svg
      width={logoFrame ? size : size * BOLT_ASPECT}
      height={size}
      viewBox={logoFrame ? `0 0 ${LOGO_SIZE} ${LOGO_SIZE}` : `${x} ${y} ${width} ${height}`}
      opacity={opacity}
    >
      {useGradient ? (
        <Defs>
          <LinearGradient id={gradientId} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor={colors.greenLight} />
            <Stop offset="0.55" stopColor={colors.green} />
            <Stop offset="1" stopColor={colors.greenDark} />
          </LinearGradient>
        </Defs>
      ) : null}
      <Polygon
        points={BOLT_POINTS}
        fill={fill}
        stroke={fill}
        strokeWidth={BOLT_STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
