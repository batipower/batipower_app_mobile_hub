import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { hubOrdersApi } from '@/api/hubOrders';
import { hubProductsApi } from '@/api/hubProducts';

import {
  looksLikeOrderReference,
  MIN_SEARCH_LENGTH,
  mergeOrderResults,
  PREVIEW_LIMIT,
} from '../searchHelpers';
import { useDebouncedTerm } from './useDebouncedTerm';

const SEARCH_STALE_MS = 60_000;

/**
 * Recherche unifiée du HUB, pendant mobile de `HubSearchBar` : une seule saisie
 * interroge en parallèle
 *  - les commandes (référence, téléphone, suivi, email, nom) ;
 *  - les commandes qui contiennent la référence produit ;
 *  - les fiches produit (SUPERADMIN et MANAGER seulement).
 *
 * Les deux voies « commande » sont fusionnées et dédoublonnées. La recherche par produit
 * est sautée quand le terme est une référence commande (`BATPWR…`) ou qu'une commande
 * porte déjà exactement cette référence : même règle que le web.
 */
export function useUnifiedSearch(rawTerm: string, canSearchProducts: boolean) {
  const term = useDebouncedTerm(rawTerm);
  const enabled = term.length >= MIN_SEARCH_LENGTH;

  const sav = useQuery({
    queryKey: ['hub-search', 'orders', term],
    queryFn: ({ signal }) =>
      hubOrdersApi.searchSav(term, { limit: PREVIEW_LIMIT, preview: true, signal }),
    enabled,
    staleTime: SEARCH_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const savExactReference =
    sav.isSuccess &&
    !sav.isPlaceholderData &&
    (sav.data?.orders ?? []).some((order) => order.reference?.toLowerCase() === term.toLowerCase());
  const skipProductOrders = looksLikeOrderReference(term) || savExactReference;

  const byProduct = useQuery({
    queryKey: ['hub-search', 'orders-by-product', term],
    queryFn: ({ signal }) =>
      hubOrdersApi.searchByProductReference(term, {
        limit: PREVIEW_LIMIT,
        preview: true,
        signal,
      }),
    enabled: enabled && !skipProductOrders,
    staleTime: SEARCH_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const products = useQuery({
    queryKey: ['hub-search', 'products', term],
    queryFn: ({ signal }) => hubProductsApi.search(term, 8, signal),
    enabled: enabled && canSearchProducts,
    staleTime: SEARCH_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const orders = useMemo(
    () =>
      enabled
        ? mergeOrderResults(
            sav.data?.orders ?? [],
            skipProductOrders ? [] : (byProduct.data?.orders ?? []),
          )
        : [],
    [enabled, sav.data, byProduct.data, skipProductOrders],
  );
  const productHits = useMemo(
    () => (enabled && canSearchProducts ? (products.data ?? []) : []),
    [enabled, canSearchProducts, products.data],
  );

  const ordersFetching = sav.isFetching || (!skipProductOrders && byProduct.isFetching);
  const ordersError = sav.isError || (!skipProductOrders && byProduct.isError);

  return {
    /** Terme effectivement interrogé (saisie nettoyée, après délai). */
    term,
    /** Au moins `MIN_SEARCH_LENGTH` caractères : une recherche est en cours ou terminée. */
    active: enabled,
    orders,
    products: productHits,
    /** Total de commandes trouvées par la recherche libre / contenant le produit (au-delà de l'aperçu). */
    savCount: sav.data?.count ?? 0,
    productOrdersCount: skipProductOrders ? 0 : (byProduct.data?.count ?? 0),
    ordersLoading: ordersFetching && orders.length === 0,
    ordersError: orders.length === 0 && !ordersFetching && ordersError,
    productsLoading: canSearchProducts && products.isFetching && productHits.length === 0,
    productsError: canSearchProducts && products.isError && productHits.length === 0,
    /** Une requête est encore en vol (ou la saisie n'est pas encore « posée »). */
    pending: ordersFetching || products.isFetching,
    /** Les résultats affichés correspondent bien à la saisie courante (pas à la précédente). */
    settled:
      enabled &&
      !sav.isPlaceholderData &&
      !(byProduct.isPlaceholderData && !skipProductOrders) &&
      !products.isPlaceholderData,
    refetch: () =>
      Promise.all([
        sav.refetch(),
        skipProductOrders ? null : byProduct.refetch(),
        canSearchProducts ? products.refetch() : null,
      ]),
  };
}
