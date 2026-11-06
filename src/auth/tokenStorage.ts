import * as SecureStore from 'expo-secure-store';

/**
 * Stockage des jetons dans le Keychain iOS (via expo-secure-store).
 *
 * - `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` : lisible après le premier déverrouillage
 *   de l'appareil (l'app peut rafraîchir sa session au retour d'arrière-plan) et
 *   jamais migré vers un autre appareil (ni via sauvegarde, ni via iCloud).
 * - Une copie en mémoire évite de relire le Keychain à chaque requête.
 */

const ACCESS_KEY = 'bp.accessToken';
const REFRESH_KEY = 'bp.refreshToken';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

let cache: StoredTokens | null = null;
let loaded = false;

export async function getTokens(): Promise<StoredTokens | null> {
  if (loaded) return cache;
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY, OPTIONS),
    SecureStore.getItemAsync(REFRESH_KEY, OPTIONS),
  ]);
  cache = accessToken && refreshToken ? { accessToken, refreshToken } : null;
  loaded = true;
  return cache;
}

export async function setTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken, OPTIONS),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, OPTIONS),
  ]);
  cache = tokens;
  loaded = true;
}

/** Remplace uniquement le jeton d'accès (le refresh n'est pas renouvelé par le back). */
export async function setAccessToken(accessToken: string): Promise<void> {
  const current = await getTokens();
  if (!current) return;
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken, OPTIONS);
  cache = { ...current, accessToken };
}

export async function clearTokens(): Promise<void> {
  cache = null;
  loaded = true;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY, OPTIONS),
    SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS),
  ]);
}
