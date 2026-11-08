/**
 * Palette Batipower, reprise de `front_externe_batipower/app/globals.css`
 * (tokens `--bati-*`, canaux RGB convertis en hexadécimal).
 */
export const colors = {
  green: '#94C83E',
  greenDark: '#7AB32E',
  greenLight: '#A8D45A',
  /** Fond principal des écrans sombres (`--bati-black`). */
  black: '#131921',
  gray900: '#1A1F29',
  gray800: '#232F3E',
  gray700: '#37475A',
  gray600: '#485769',
  gray400: '#8C9196',
  gray300: '#C6CACA',
  white: '#FFFFFF',
  /** Erreurs de formulaire (équivalent `text-red-400` du web). */
  danger: '#F87171',
  dangerBg: 'rgba(248,113,113,0.10)',
  /** États lisibles sur fond sombre (emerald-400, amber-400, blue-400 de Tailwind). */
  success: '#34D399',
  warning: '#FBBF24',
  info: '#60A5FA',
} as const;

/**
 * Convertit une couleur hexadécimale `#RRGGBB` en `rgba()`.
 * Équivalent des opacités Tailwind du web (`white/[0.04]`, `bati-green/40`…).
 */
export function withAlpha(hex: string, alpha: number): string {
  // Les palettes claires contiennent aussi des jetons déjà en `rgba()` : on en reprend les
  // composantes RGB et on remplace l'opacité.
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(hex);
  if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  if (short) return withAlpha(`#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`, alpha);
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Couleur hexadécimale invalide : ${hex}`);
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Textes et traits blancs translucides utilisés sur les fonds sombres. */
export const onDark = {
  text: colors.white,
  textMuted: withAlpha(colors.white, 0.6),
  textSubtle: withAlpha(colors.white, 0.4),
  textFaint: withAlpha(colors.white, 0.25),
  surface: withAlpha(colors.white, 0.04),
  surfaceStrong: withAlpha(colors.white, 0.08),
  border: withAlpha(colors.white, 0.08),
  borderStrong: withAlpha(colors.white, 0.12),
} as const;
