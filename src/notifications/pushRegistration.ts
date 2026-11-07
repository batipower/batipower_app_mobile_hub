import * as SecureStore from 'expo-secure-store';

import { pushTokensApi } from '@/api/pushTokens';

/**
 * Identité push de l'installation : identifiant d'appareil et dernier token enregistré côté back.
 *
 * Stocké dans le Keychain (comme les jetons de session). Ce module n'importe rien de l'auth, pour
 * que l'`AuthProvider` puisse s'en servir à la déconnexion sans dépendance circulaire.
 */

const DEVICE_ID_KEY = 'bp.hub.deviceId';
const PUSH_TOKEN_KEY = 'bp.hub.pushToken';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** Durée maximale accordée à la désinscription : la déconnexion ne doit jamais attendre le réseau. */
const UNREGISTER_TIMEOUT_MS = 3_000;

function randomHex(length: number): string {
  let out = '';
  while (out.length < length) {
    out += Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  }
  return out.slice(0, length);
}

let deviceIdCache: string | null = null;

/** Identifiant stable de l'installation (pas un secret : il sert à dédoublonner les tokens). */
export async function getDeviceId(): Promise<string> {
  if (deviceIdCache) return deviceIdCache;
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY, OPTIONS);
    if (stored) {
      deviceIdCache = stored;
      return stored;
    }
  } catch {
    // Keychain illisible : on retombe sur un identifiant généré ci-dessous.
  }
  const generated = `${Date.now().toString(36)}-${randomHex(16)}`;
  deviceIdCache = generated;
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, generated, OPTIONS);
  } catch {
    // Identifiant volatil : au pire, un token orphelin sera désactivé par le back (DeviceNotRegistered).
  }
  return generated;
}

async function readStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY, OPTIONS);
  } catch {
    return null;
  }
}

async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY, OPTIONS);
  } catch {
    // Rien à faire : le prochain enregistrement l'écrasera.
  }
}

/** Enregistre le token auprès du back puis le mémorise pour pouvoir le désinscrire. */
export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const deviceId = await getDeviceId();
  await pushTokensApi.register({ token, platform, deviceId });
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token, OPTIONS);
  } catch {
    // Sans mémorisation, la désinscription à la déconnexion est simplement ignorée.
  }
}

/**
 * Désactive côté back le token mémorisé, au mieux : hors ligne, erreur serveur ou session déjà
 * invalide, on n'échoue jamais (ni n'attend au-delà de quelques secondes) pour ne pas bloquer
 * la déconnexion. À appeler tant que le jeton de session est encore valide.
 */
export async function unregisterStoredPushToken(): Promise<void> {
  const token = await readStoredToken();
  if (!token) return;

  const request = pushTokensApi.unregister(token).then(
    () => true,
    () => false,
  );
  const timeout = new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(false), UNREGISTER_TIMEOUT_MS),
  );
  const done = await Promise.race([request, timeout]);
  if (done) await clearStoredToken();
}
