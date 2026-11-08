import { useEffect, useRef, useState } from 'react';

import { partnerProductsApi } from '@/api/partnerProducts';

const CHUNK_SIZE = 30;

/**
 * Miniatures des références affichées : le back les sert à part de la liste (lourdes en base64).
 * Chaque référence n'est demandée qu'une fois ; un échec la remet en file pour une prochaine page.
 */
export function useThumbnails(references: readonly string[]): Record<string, string | null> {
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const missing = references.filter((reference) => !requested.current.has(reference));
    if (missing.length === 0) return;
    missing.forEach((reference) => requested.current.add(reference));

    for (let index = 0; index < missing.length; index += CHUNK_SIZE) {
      const chunk = missing.slice(index, index + CHUNK_SIZE);
      partnerProductsApi
        .thumbnails(chunk)
        .then((result) => setThumbs((previous) => ({ ...previous, ...result })))
        .catch(() => chunk.forEach((reference) => requested.current.delete(reference)));
    }
  }, [references]);

  return thumbs;
}
