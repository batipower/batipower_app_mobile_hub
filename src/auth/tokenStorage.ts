import * as SecureStore from 'expo-secure-store';

/**
 * Stockage des jetons dans le Keychain iOS (via expo-secure-store).
 *
 * - `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` : lisible après le premier déverrouillage
 *   de l'appareil (l'app peut rafraîchir sa session au retour d'arrière-plan) et
 *   jamais migré vers un autre appareil (ni via sauvegarde, ni via iCloud).
 * - Une copie en mémoire évite de relire le Keychain à chaque requête.
 *
 * Deux jeux de jetons coexistent :
 * - la session du compte connecté (accès + refresh) ;
 * - l'impersonation d'un SUPERADMIN (jeton d'accès du compte usurpé + son identifiant),
 *   superposée à la session sans la remplacer : le back ne délivre aucun refresh token
 *   pour un compte usurpé, il faut donc garder les jetons du SUPERADMIN pour le renouveler.
 */

const ACCESS_KEY = 'bp.accessToken';
const REFRESH_KEY = 'bp.refreshToken';
const IMPERSONATION_ACCESS_KEY = 'bp.impersonation.accessToken';
const IMPERSONATION_TARGET_KEY = 'bp.impersonation.targetUserId';

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

/** Efface la session, et l'impersonation qui lui est attachée. */
export async function clearTokens(): Promise<void> {
  cache = null;
  loaded = true;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY, OPTIONS),
    SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS),
    clearImpersonation(),
  ]);
}

// ─── Impersonation ───────────────────────────────────────────────────────────

export interface StoredImpersonation {
  /** Jeton d'accès du compte usurpé (2 h, sans refresh token). */
  accessToken: string;
  /** Compte usurpé : permet de redemander un jeton quand celui-ci expire. */
  targetUserId: string;
}

let impersonationCache: StoredImpersonation | null = null;
let impersonationLoaded = false;

export async function getImpersonation(): Promise<StoredImpersonation | null> {
  if (impersonationLoaded) return impersonationCache;
  const [accessToken, targetUserId] = await Promise.all([
    SecureStore.getItemAsync(IMPERSONATION_ACCESS_KEY, OPTIONS),
    SecureStore.getItemAsync(IMPERSONATION_TARGET_KEY, OPTIONS),
  ]);
  impersonationCache = accessToken && targetUserId ? { accessToken, targetUserId } : null;
  impersonationLoaded = true;
  return impersonationCache;
}

export async function setImpersonation(impersonation: StoredImpersonation): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(IMPERSONATION_ACCESS_KEY, impersonation.accessToken, OPTIONS),
    SecureStore.setItemAsync(IMPERSONATION_TARGET_KEY, impersonation.targetUserId, OPTIONS),
  ]);
  impersonationCache = impersonation;
  impersonationLoaded = true;
}

export async function clearImpersonation(): Promise<void> {
  impersonationCache = null;
  impersonationLoaded = true;
  await Promise.all([
    SecureStore.deleteItemAsync(IMPERSONATION_ACCESS_KEY, OPTIONS),
    SecureStore.deleteItemAsync(IMPERSONATION_TARGET_KEY, OPTIONS),
  ]);
}
