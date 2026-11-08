import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'pa-reserve-claim-token';

let memoryToken: string | null = null;
let inFlight: Promise<string> | null = null;

async function load(): Promise<string> {
  try {
    const saved = await SecureStore.getItemAsync(STORAGE_KEY);
    if (saved) return saved;
  } catch {
    // Stockage indisponible : on retombe sur un jeton en mémoire pour la session.
  }
  const created = Crypto.randomUUID();
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, created);
  } catch {
    // Jeton valable pour cette session seulement.
  }
  return created;
}

/**
 * Jeton du poste (cet appareil) pour la réserve d'analyse : identifie qui détient les lignes
 * EN_COURS. Stable d'un lancement à l'autre (permet de reprendre ses lignes), distinct d'un
 * appareil ou d'un navigateur à l'autre.
 */
export function getReserveClaimToken(): Promise<string> {
  if (memoryToken) return Promise.resolve(memoryToken);
  inFlight ??= load().then((token) => {
    memoryToken = token;
    return token;
  });
  return inFlight;
}
