import { useEffect, useState } from 'react';

import { searchDebounceMs } from '../searchHelpers';

/**
 * Terme de recherche « posé » : la saisie nettoyée, mise à jour après un court délai
 * qui dépend de sa forme (code collé ou scanné : rapide ; texte libre : plus patient).
 * Une saisie vidée est répercutée tout de suite.
 */
export function useDebouncedTerm(value: string): string {
  const trimmed = value.trim();
  const [term, setTerm] = useState(trimmed);

  // Vidage immédiat, ajusté pendant le rendu (et non dans un effet) pour qu'aucun
  // ancien terme ne réapparaisse quand l'utilisateur ressaisit juste après avoir effacé.
  if (trimmed === '' && term !== '') setTerm('');

  useEffect(() => {
    if (trimmed === '') return;
    const timeout = setTimeout(() => setTerm(trimmed), searchDebounceMs(trimmed));
    return () => clearTimeout(timeout);
  }, [trimmed]);

  return term;
}
