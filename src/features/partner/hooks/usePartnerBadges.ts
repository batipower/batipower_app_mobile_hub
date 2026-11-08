import { useQuery } from '@tanstack/react-query';

import type { PartnerTab } from '@/auth/permissions';
import { partnerDeliveryNotesApi } from '@/api/partnerDeliveryNotes';
import { partnerOpportunitiesApi } from '@/api/partnerOpportunities';
import { partnerProductsApi } from '@/api/partnerProducts';

import {
  PARTNER_DELIVERY_NOTES_KEY,
  PARTNER_OPPORTUNITIES_KEY,
  PARTNER_PRODUCTS_PENDING_KEY,
} from '../queryKeys';

const REFRESH_MS = 60_000;

/**
 * Compteurs des pastilles de la barre d'onglets : produits dont un message attend une réponse,
 * opportunités à traiter (standard et DEP) et BL à traiter. Une requête n'est lancée que pour
 * l'onglet que le compte possède ; un échec réseau laisse simplement la pastille éteinte.
 */
export function usePartnerBadges(tabs: readonly PartnerTab[], standardOpportunities: boolean) {
  const hasProducts = tabs.includes('produits');
  const hasOpportunities = tabs.includes('opportunites');
  const hasDeliveryNotes = tabs.includes('bl');

  const products = useQuery({
    queryKey: PARTNER_PRODUCTS_PENDING_KEY,
    queryFn: ({ signal }) => partnerProductsApi.pendingMessagesCount({ signal }),
    enabled: hasProducts,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
  });

  const opportunitiesStandard = useQuery({
    queryKey: [...PARTNER_OPPORTUNITIES_KEY, 'pending', 'STANDARD'],
    queryFn: ({ signal }) => partnerOpportunitiesApi.pendingCount('STANDARD', { signal }),
    enabled: hasOpportunities && standardOpportunities,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
  });

  const opportunitiesDep = useQuery({
    queryKey: [...PARTNER_OPPORTUNITIES_KEY, 'pending', 'DEP'],
    queryFn: ({ signal }) => partnerOpportunitiesApi.pendingCount('DEP', { signal }),
    enabled: hasOpportunities,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
  });

  const deliveryNotes = useQuery({
    queryKey: [...PARTNER_DELIVERY_NOTES_KEY, 'pending'],
    queryFn: ({ signal }) => partnerDeliveryNotesApi.pendingCount({ signal }),
    enabled: hasDeliveryNotes,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
  });

  return {
    products: products.data?.count ?? 0,
    opportunities:
      (opportunitiesStandard.data?.count ?? 0) + (opportunitiesDep.data?.count ?? 0),
    deliveryNotes: deliveryNotes.data?.count ?? 0,
  };
}
