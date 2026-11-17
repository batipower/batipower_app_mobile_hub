import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Référence toujours à jour (écrite après le rendu) : pour les callbacks différés et les timers. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
