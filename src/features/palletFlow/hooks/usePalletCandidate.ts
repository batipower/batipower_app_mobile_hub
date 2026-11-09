import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { hubPalletFlowApi } from '@/api/hubPalletFlow';
import { useOrderDetail } from '@/features/orders/hooks/useOrderDetail';

import { palletMarginKey, palletQuotesKey } from '../queryKeys';

/**
 * Tout ce que la page d'arbitrage affiche pour une commande : la fiche (commande, adresse,
 * articles), les devis palette et la simulation de marge. Les trois requêtes partent en parallèle.
 * La marge est secondaire : son échec (eBatPro injoignable…) n'empêche pas d'arbitrer.
 */
export function usePalletCandidate(reference: string | undefined) {
  const order = useOrderDetail(reference);

  const quotesQuery = useQuery({
    queryKey: palletQuotesKey(reference),
    queryFn: ({ signal }) => hubPalletFlowApi.getQuotesByOrder(reference ?? '', signal),
    enabled: !!reference,
    staleTime: 30_000,
  });

  const marginQuery = useQuery({
    queryKey: palletMarginKey(reference),
    queryFn: ({ signal }) => hubPalletFlowApi.getMarginSimulation(reference ?? '', signal),
    enabled: !!reference,
    staleTime: 60_000,
    retry: 1,
  });

  const { refetch: refetchOrder } = order;
  const { refetch: refetchQuotes } = quotesQuery;
  const { refetch: refetchMargin } = marginQuery;
  const refetch = useCallback(
    () => Promise.all([refetchOrder(), refetchQuotes(), refetchMargin()]),
    [refetchOrder, refetchQuotes, refetchMargin],
  );

  return {
    order,
    quotes: quotesQuery.data?.data ?? [],
    quotesLoading: quotesQuery.isPending && quotesQuery.fetchStatus !== 'idle',
    margin: marginQuery.data?.data ?? null,
    marginLoading: marginQuery.isPending && marginQuery.fetchStatus !== 'idle',
    marginError: marginQuery.error,
    refetchMargin,
    refetch,
  };
}
