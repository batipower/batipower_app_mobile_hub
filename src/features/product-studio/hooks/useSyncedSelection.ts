/* eslint-disable react-hooks/exhaustive-deps -- les `useLatest` sont des refs stables, volontairement hors dépendances */

import { useLatest } from '../lib/useLatest';
import { useCallback, useEffect, useState } from 'react';

/**
 * Sélection locale (cases à cocher) resynchronisée sur la sélection serveur dès
 * que celle-ci change (recalcul, enregistrement), sans écraser une saisie en cours.
 */
export function useSyncedSelection<T extends string | number>(serverSelected: T[]) {
  const serverRef = useLatest(serverSelected);
  const syncKey = [...serverSelected].sort().join('|');
  const [selected, setSelected] = useState<Set<T>>(() => new Set(serverSelected));

  useEffect(() => {
    setSelected(new Set(serverRef.current));
  }, [syncKey]);

  const toggle = useCallback((value: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  return { selected, toggle, setSelected, syncKey };
}
