import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

/**
 * Reconnexion par Face ID.
 *
 * Face ID ne quitte jamais l'appareil : il protège, dans le Keychain iOS, un « jeton d'appareil »
 * de longue durée que le back échange contre une session neuve (sans mot de passe ni code 2FA).
 *
 * - `DEVICE_TOKEN_KEY` : le jeton, stocké avec `requireAuthentication` (la lecture déclenche
 *   Face ID). iOS le rend illisible si les données biométriques changent (nouveau visage).
 * - `PREFERENCE_KEY` : l'email et le nom de l'appareil, lisibles sans Face ID, pour savoir s'il
 *   faut proposer le bouton sans déclencher d'invite.
 * - `DEVICE_ID_KEY` : identifiant aléatoire de l'installation, jamais effacé, pour que deux
 *   iPhone du même compte ne s'écrasent pas côté back.
 */

const DEVICE_TOKEN_KEY = 'bp.biometric.deviceToken';
const PREFERENCE_KEY = 'bp.biometric.preference';
const DEVICE_ID_KEY = 'bp.biometric.deviceId';
const PROMPT_DISMISSED_KEY = 'bp.biometric.promptDismissed';

const PLAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const PROTECTED_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Confirmez votre identité pour vous reconnecter à Batipower Pro',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

export interface BiometricPreference {
  email: string;
  deviceName: string;
}

export type ReadTokenResult =
  | { status: 'ok'; token: string }
  /** Invite Face ID annulée ou échouée : on peut réessayer. */
  | { status: 'failed' }
  /** Jeton absent ou invalidé par iOS (Face ID modifié) : la fonction doit être réactivée. */
  | { status: 'invalidated' };

let preferenceCache: BiometricPreference | null | undefined;

/** Face ID (ou Touch ID) est configuré sur cet appareil et utilisable par SecureStore. */
export function isBiometricAvailable(): boolean {
  try {
    return SecureStore.canUseBiometricAuthentication();
  } catch {
    return false;
  }
}

export async function getBiometricPreference(): Promise<BiometricPreference | null> {
  if (preferenceCache !== undefined) return preferenceCache;
  try {
    const raw = await SecureStore.getItemAsync(PREFERENCE_KEY, PLAIN_OPTIONS);
    const parsed = raw ? (JSON.parse(raw) as Partial<BiometricPreference>) : null;
    preferenceCache =
      parsed && typeof parsed.email === 'string' && typeof parsed.deviceName === 'string'
        ? { email: parsed.email, deviceName: parsed.deviceName }
        : null;
  } catch {
    preferenceCache = null;
  }
  return preferenceCache;
}

/** Nom d'appareil envoyé au back : modèle + identifiant d'installation (stable, unique). */
export async function getDeviceName(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY, PLAIN_OPTIONS).catch(() => null);
  if (!id) {
    id = Crypto.randomUUID().slice(0, 8);
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id, PLAIN_OPTIONS).catch(() => undefined);
  }
  return `${Device.modelName ?? 'iPhone'} · ${id}`;
}

/**
 * Enregistre (ou remplace) le jeton d'appareil. Sur iOS, écraser une valeur protégée redemande
 * Face ID : on supprime donc l'ancienne avant de recréer l'élément (la création ne déclenche pas
 * d'invite).
 */
export async function saveDeviceToken(token: string): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY).catch(() => undefined);
  await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token, PROTECTED_OPTIONS);
}

export async function savePreference(preference: BiometricPreference): Promise<void> {
  await SecureStore.setItemAsync(PREFERENCE_KEY, JSON.stringify(preference), PLAIN_OPTIONS);
  preferenceCache = preference;
}

/** Lit le jeton : l'invite Face ID s'affiche ici. */
export async function readDeviceToken(): Promise<ReadTokenResult> {
  try {
    const token = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY, PROTECTED_OPTIONS);
    return token ? { status: 'ok', token } : { status: 'invalidated' };
  } catch {
    return { status: 'failed' };
  }
}

/** Efface le jeton et la préférence, sans invite Face ID. */
export async function clearBiometricCredentials(): Promise<void> {
  preferenceCache = null;
  await Promise.all([
    SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(PREFERENCE_KEY, PLAIN_OPTIONS).catch(() => undefined),
  ]);
}

/** L'utilisateur a refusé la proposition d'activation : on ne la lui refait pas. */
export async function isActivationPromptDismissed(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(PROMPT_DISMISSED_KEY, PLAIN_OPTIONS).catch(
    () => null,
  );
  return value === '1';
}

export async function dismissActivationPrompt(): Promise<void> {
  await SecureStore.setItemAsync(PROMPT_DISMISSED_KEY, '1', PLAIN_OPTIONS).catch(() => undefined);
}
