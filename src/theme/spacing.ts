/** Échelle d'espacement (multiples de 4, comme Tailwind). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

/** Rayons du web (`--radius` = 6 px : `rounded-md` = 6, `rounded-lg` = 8). */
export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 999,
} as const;

/** Ombre légère des cartes du web (`shadow-bati-sm`, teintée `#131921`). */
export const shadow = {
  sm: {
    shadowColor: '#131921',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;

/** Hauteur minimale des zones tactiles (recommandation Apple : 44 pt). */
export const hitTarget = 44;
