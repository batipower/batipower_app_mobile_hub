import { colors, onDark, withAlpha } from './colors';

export type ColorScheme = 'light' | 'dark';

/**
 * Couleurs sémantiques d'un thème. Les écrans ne choisissent plus « blanc » ou « noir »
 * mais un rôle (`text`, `card`, `border`…) que chaque palette traduit.
 */
export interface Theme {
  scheme: ColorScheme;

  /** Fond des écrans. */
  bg: string;
  /** Fond des feuilles (sheet) et surfaces surélevées. */
  bgElevated: string;
  /** Conteneur autonome (carte de résultat, ligne de liste) posé sur `bg`. */
  card: string;
  cardPressed: string;
  /** Surface en creux à l'intérieur d'une carte (tuile, puce, champ). */
  surface: string;
  surfaceStrong: string;
  /** Élément mis en avant sur une surface en creux (segment actif d'un contrôle). */
  raised: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;

  /** Vert de marque pour les fonds (boutons, filets, teintes). */
  accent: string;
  accentPressed: string;
  /** Vert lisible pour du texte ou des icônes sur le fond du thème. */
  accentText: string;
  /** Texte posé sur `accent`. */
  onAccent: string;

  danger: string;
  dangerBg: string;
  success: string;
  warning: string;
  info: string;
  purple: string;
  neutral: string;

  /** Teinte des flous (`expo-blur`). */
  blurTint: 'dark' | 'light';
}

export const darkTheme: Theme = {
  scheme: 'dark',

  // Variables `.dark` de `front_externe_batipower/app/globals.css` (HSL converties en hex).
  bg: '#0F131A',
  bgElevated: '#181D25',
  card: '#181D25',
  cardPressed: '#212832',
  surface: onDark.surface,
  surfaceStrong: onDark.surfaceStrong,
  raised: onDark.surfaceStrong,
  border: '#363D49',
  borderStrong: '#454E5C',

  text: '#F0F2F5',
  textMuted: '#8D97A5',
  textSubtle: onDark.textSubtle,
  textFaint: onDark.textFaint,

  accent: colors.green,
  accentPressed: colors.greenDark,
  accentText: colors.green,
  onAccent: colors.white,

  danger: colors.danger,
  dangerBg: colors.dangerBg,
  success: colors.success,
  warning: colors.warning,
  info: colors.info,
  purple: '#A78BFA',
  neutral: colors.gray300,

  blurTint: 'dark',
};

/** Encre du site web (`#0F1111`) : base des textes et des traits du thème clair. */
const INK = '#0F1111';

export const lightTheme: Theme = {
  scheme: 'light',

  // Fond de page, cartes et bordures du web (`--background`, `--card`, `--border`).
  bg: '#EAEDED',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardPressed: '#F3F3F3',
  surface: withAlpha(INK, 0.04),
  surfaceStrong: withAlpha(INK, 0.08),
  raised: '#FFFFFF',
  border: '#D5D9D9',
  borderStrong: '#C6CACA',

  text: INK,
  textMuted: withAlpha(INK, 0.64),
  textSubtle: withAlpha(INK, 0.56),
  textFaint: withAlpha(INK, 0.4),

  accent: colors.green,
  accentPressed: colors.greenDark,
  // Le vert de marque est trop clair pour du texte sur fond clair (contraste ~2:1).
  accentText: '#4F7D0E',
  onAccent: colors.white,

  danger: '#DC2626',
  dangerBg: 'rgba(220,38,38,0.08)',
  success: '#047857',
  warning: '#B45309',
  info: '#1D4ED8',
  purple: '#6D28D9',
  neutral: '#565959',

  blurTint: 'light',
};

export function themeFor(scheme: ColorScheme | null | undefined): Theme {
  return scheme === 'light' ? lightTheme : darkTheme;
}
