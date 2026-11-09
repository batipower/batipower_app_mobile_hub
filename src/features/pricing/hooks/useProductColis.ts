import { useQuery } from '@tanstack/react-query';

import { hubProductsApi } from '@/api/hubProducts';

export const productColisKey = (reference: string) =>
  ['hub-pricing', 'nb-piece-by-colis', reference] as const;

/**
 * Pièces par colis d'un produit (`nbPieceByColis` de la fiche) : absent de la ligne Pricing, lu sur
 * l'en-tête produit. `null` : 1 unité = 1 colis (produits de moins de 5 kg regroupés jusqu'à 30 kg).
 */
export function useProductColis(reference: string | undefined, enabled = true) {
  const query = useQuery({
    queryKey: productColisKey(reference ?? ''),
    queryFn: async ({ signal }) => {
      const header = await hubProductsApi.getHeader(reference ?? '', signal);
      return header.nbPieceByColis ?? null;
    },
    enabled: enabled && !!reference,
    staleTime: 60_000,
  });

  return {
    /** `undefined` tant que la fiche n'est pas chargée. */
    nbPieceByColis: query.data,
    loading: query.isPending && query.fetchStatus !== 'idle',
  };
}
