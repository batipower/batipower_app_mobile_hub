import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Préférence d'apparence choisie dans le profil : `system` suit le réglage de l'iPhone.
 * Le choix est conservé sur l'appareil (lecture synchrone, pour que le premier rendu
 * ait déjà le bon thème) et appliqué à toute l'app via `Appearance.setColorScheme` :
 * les éléments natifs (onglets, feuilles, barre de recherche, clavier) suivent aussi.
 *
 * Par défaut l'app reste sombre, comme avant l'arrivée du mode clair.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['dark', 'light', 'system'];

const STORAGE_KEY = 'bp.themePreference';
const DEFAULT_PREFERENCE: ThemePreference = 'dark';
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = SecureStore.getItem(STORAGE_KEY, STORAGE_OPTIONS);
    return isPreference(stored) ? stored : DEFAULT_PREFERENCE;
  } catch {
    // Keychain indisponible (appareil verrouillé au démarrage) : thème par défaut.
    return DEFAULT_PREFERENCE;
  }
}

function applyPreference(preference: ThemePreference): void {
  // `auto` retire la surcharge : l'app suit alors le réglage de l'iPhone.
  Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
}

let current = readStoredPreference();
// Appliqué dès l'import, avant le premier rendu : pas de flash du mauvais thème.
applyPreference(current);

const listeners = new Set<() => void>();

export function getThemePreference(): ThemePreference {
  return current;
}

export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setThemePreference(preference: ThemePreference): void {
  if (preference === current) return;
  current = preference;
  applyPreference(preference);
  try {
    SecureStore.setItem(STORAGE_KEY, preference, STORAGE_OPTIONS);
  } catch {
    // La préférence reste active pour la session même si elle n'a pas pu être mémorisée.
  }
  listeners.forEach((listener) => listener());
}
