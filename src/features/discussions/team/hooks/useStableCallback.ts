import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Renvoie une fonction d'identité stable qui appelle toujours la dernière version de `fn`.
 * Évite de re-rendre les lignes mémoïsées d'une liste à chaque changement d'état du parent.
 */
export function useStableCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  const latest = useRef(fn);
  useLayoutEffect(() => {
    latest.current = fn;
  });
  return useCallback((...args: Args) => latest.current(...args), []);
}
