import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const SKIP_WEIGHT_KEY = 'pa-skip-weight';

let skipWeightCache: boolean | null = null;
const listeners = new Set<(value: boolean) => void>();

/** Lecture ponctuelle de « Ignorer la saisie du poids » (utilisée hors composant). */
export async function readSkipWeight(): Promise<boolean> {
  if (skipWeightCache !== null) return skipWeightCache;
  try {
    skipWeightCache = (await SecureStore.getItemAsync(SKIP_WEIGHT_KEY)) === '1';
  } catch {
    skipWeightCache = false;
  }
  return skipWeightCache;
}

async function writeSkipWeight(value: boolean) {
  skipWeightCache = value;
  listeners.forEach((listener) => listener(value));
  try {
    await SecureStore.setItemAsync(SKIP_WEIGHT_KEY, value ? '1' : '0');
  } catch {
    // La préférence reste valable pour la session.
  }
}

/** Interrupteur « Ignorer la saisie du poids », mémorisé dans le Keychain (SecureStore). */
export function useSkipWeight(): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(skipWeightCache ?? false);

  useEffect(() => {
    let alive = true;
    void readSkipWeight().then((v) => {
      if (alive) setValue(v);
    });
    listeners.add(setValue);
    return () => {
      alive = false;
      listeners.delete(setValue);
    };
  }, []);

  const update = useCallback((next: boolean) => {
    void writeSkipWeight(next);
  }, []);

  return [value, update];
}
