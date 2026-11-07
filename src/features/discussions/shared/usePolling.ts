import { useIsFocused } from 'expo-router';

/**
 * Intervalle de `refetchInterval` limité à l'écran qui a le focus. L'app au premier plan est
 * déjà gérée par le `focusManager` de `api/queryClient.ts` : en arrière-plan, TanStack Query
 * suspend lui-même les rafraîchissements automatiques.
 */
export function usePollingInterval(intervalMs: number): number | false {
  const focused = useIsFocused();
  return focused ? intervalMs : false;
}
