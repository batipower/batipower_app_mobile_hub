import { Platform, type TextStyle } from 'react-native';

/** Police à chasse fixe pour les références commande et produit (`font-mono` du web). */
export const monoFontFamily = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * Typographie : police système (SF Pro sur iOS), qui respecte aussi Dynamic Type
 * via `allowFontScaling` (activé par défaut sur les `Text`).
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const typography = {
  title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  body: { fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  /** Libellé de champ ou de groupe : petites capitales espacées, comme sur le web. */
  label: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  button: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.regular },
} as const satisfies Record<string, TextStyle>;
