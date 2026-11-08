import type {
  PartnerOpportunityScope,
  PartnerOpportunityStatus,
} from '@/types/partnerOpportunities';

import { createFiltersStore } from '../shared/createFiltersStore';

export type OpportunityStatusFilter = PartnerOpportunityStatus | 'ALL';

export type OpportunitiesFilters = {
  scope: PartnerOpportunityScope;
  /** Comme le web : on arrive sur les opportunités ouvertes (à traiter). */
  status: OpportunityStatusFilter;
  brand: string | null;
  /** Ouvertes non lues (n'a de sens que sur le statut « Ouvertes »). */
  unreadOnly: boolean;
};

const store = createFiltersStore<OpportunitiesFilters>({
  scope: 'STANDARD',
  status: 'OPEN',
  brand: null,
  unreadOnly: false,
});

export const useOpportunitiesFilters = store.useFilters;
export const patchOpportunitiesFilters = store.patch;
/** Remise à zéro complète (déconnexion). */
export const resetOpportunitiesFilters = store.reset;

/** Efface les filtres secondaires en gardant le périmètre et le statut choisis. */
export function clearOpportunitiesFilters() {
  store.patch({ brand: null, unreadOnly: false });
}

/** Nombre de filtres secondaires actifs (le statut a ses propres puces). */
export function countActiveOpportunitiesFilters(filters: OpportunitiesFilters) {
  return (filters.brand ? 1 : 0) + (filters.unreadOnly && filters.status === 'OPEN' ? 1 : 0);
}
