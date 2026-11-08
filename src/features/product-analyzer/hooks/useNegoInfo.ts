import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { hubProductAnalyzerApi, type NegotiationScopeContext } from '@/api/hubProductAnalyzer';
import type { NegotiationOpportunitySummary } from '@/features/product-analyzer/lib/negotiation-api';
import type { NegotiationRequest, StagingFilters } from '@/types/hubProductAnalyzer';

import { PA_ROOT } from '../queryKeys';

/** Négos cloisonnées par fournisseur : celui de l'affaire filtrée, sinon le filtre fournisseur. */
export function negoScopeOf(filters: Pick<StagingFilters, 'affaire' | 'affaireId' | 'distributorId'>): NegotiationScopeContext {
  return {
    ...(filters.affaire && filters.affaireId ? { affaireId: filters.affaireId } : {}),
    ...(filters.distributorId ? { distributorId: filters.distributorId } : {}),
  };
}

const EMPTY_OPEN: Record<string, NegotiationOpportunitySummary | null> = {};
const EMPTY_REQUESTS: Record<string, NegotiationRequest[]> = {};

/**
 * Informations de négociation des produits affichés : négo ouverte (dans le périmètre du
 * fournisseur) et demandes par entrepôt (tous fournisseurs confondus).
 */
export function useNegoInfo(uuids: string[], scope: NegotiationScopeContext) {
  const key = uuids.join('|');
  const enabled = uuids.length > 0;

  const open = useQuery({
    queryKey: [...PA_ROOT, 'open-nego', scope.affaireId ?? '', scope.distributorId ?? '', key],
    queryFn: ({ signal }) => hubProductAnalyzerApi.getOpenOpportunities(uuids, scope, signal),
    enabled,
    staleTime: 15_000,
  });

  const requests = useQuery({
    queryKey: [...PA_ROOT, 'nego-requests', key],
    queryFn: ({ signal }) => hubProductAnalyzerApi.getNegotiationRequests(uuids, signal),
    enabled,
    staleTime: 15_000,
  });

  return useMemo(
    () => ({
      open: open.data ?? EMPTY_OPEN,
      requests: requests.data ?? EMPTY_REQUESTS,
    }),
    [open.data, requests.data],
  );
}
