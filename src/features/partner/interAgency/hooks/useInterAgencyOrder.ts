import { useInterAgencyOrdersQuery } from './useInterAgencyOrders';

/**
 * Une commande inter-agence, lue dans la liste en cache : le back n'expose pas de fiche seule,
 * la commande disparaît de la liste dès qu'elle est expédiée, collectée ou livrée.
 */
export function useInterAgencyOrder(reference: string | undefined) {
  const query = useInterAgencyOrdersQuery();
  const order = query.data?.find((candidate) => candidate.reference === reference);
  return {
    order,
    loading: query.isPending,
    error: query.error,
    notFound: !!query.data && !order,
    refetch: query.refetch,
  };
}
