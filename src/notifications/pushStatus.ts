import { useSyncExternalStore } from 'react';

/**
 * État de la dernière synchronisation du token push, exposé à l'écran Profil pour diagnostiquer
 * « je ne reçois aucune notification » sur un build de production (où la console est invisible).
 */
export type PushSyncState =
  /** Pas encore tenté (ou compte non éligible). */
  | 'idle'
  /** Simulateur ou Expo Go : aucun push distant possible. */
  | 'unavailable'
  | 'syncing'
  | 'ok'
  /** Permission iOS refusée : à rétablir dans les Réglages. */
  | 'denied'
  | 'noProject'
  | 'error';

export interface PushStatus {
  state: PushSyncState;
  /** Détail lisible de l'erreur, le cas échéant. */
  message?: string;
  /** Token Expo enregistré (tronqué à l'affichage). */
  token?: string;
  /** Horodatage (ms) du dernier changement d'état. */
  at: number;
}

let current: PushStatus = { state: 'idle', at: Date.now() };
const listeners = new Set<() => void>();

export function setPushStatus(next: Omit<PushStatus, 'at'>): void {
  current = { ...next, at: Date.now() };
  listeners.forEach((listener) => listener());
}

export function getPushStatus(): PushStatus {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePushStatus(): PushStatus {
  return useSyncExternalStore(subscribe, getPushStatus, getPushStatus);
}

type SyncRunner = (force: boolean) => Promise<void>;
let runner: SyncRunner | null = null;

/** Enregistré par `usePushNotifications` tant que la session est éligible. */
export function registerPushSyncRunner(next: SyncRunner | null): void {
  runner = next;
}

/** Relance l'enregistrement (en forçant l'appel au back même si le token n'a pas changé). */
export async function resyncPush(): Promise<boolean> {
  if (!runner) return false;
  await runner(true);
  return true;
}
