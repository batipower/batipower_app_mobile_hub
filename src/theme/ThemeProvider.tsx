import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { darkTheme, themeFor, type ColorScheme, type Theme } from './palettes';
import {
  getThemePreference,
  setThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from './preference';

/** Forme attendue par `StyleSheet.create` (types internes de React Native). */
type StyleInput = Parameters<typeof StyleSheet.create>[0];

const ThemeContext = createContext<Theme>(darkTheme);

/**
 * Fournit le thème de l'app. `useColorScheme` reflète la préférence appliquée via
 * `Appearance.setColorScheme` (voir `preference.ts`), ou le réglage de l'iPhone en mode auto.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  return <ThemeContext.Provider value={themeFor(scheme)}>{children}</ThemeContext.Provider>;
}

/** Impose un thème à une partie de l'app (écrans de connexion, toujours sombres). */
export function ForcedTheme({ scheme, children }: { scheme: ColorScheme; children: ReactNode }) {
  return <ThemeContext.Provider value={themeFor(scheme)}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Préférence d'apparence (sombre, clair, auto) et son modificateur. */
export function useThemePreference(): {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
} {
  const preference = useSyncExternalStore(subscribeThemePreference, getThemePreference);
  return { preference, setPreference: setThemePreference };
}

/**
 * Styles dépendants du thème. Équivalent de `StyleSheet.create` : on déclare la fabrique
 * au niveau du module, puis chaque composant appelle le hook retourné.
 *
 * ```ts
 * const useStyles = makeStyles((t) => ({ title: { color: t.text } }));
 * function Title() { const styles = useStyles(); … }
 * ```
 */
export function makeStyles<S extends StyleInput>(
  factory: (theme: Theme) => S & StyleInput,
): () => Readonly<S> {
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
