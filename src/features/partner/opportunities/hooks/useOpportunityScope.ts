import { useAuth } from '@/auth/AuthProvider';
import { canAccessPartnerOpportunitiesStandard } from '@/auth/permissions';
import type { PartnerOpportunityScope } from '@/types/partnerOpportunities';

import { useOpportunitiesFilters } from '../filtersStore';

/**
 * Périmètre effectif des opportunités : le choix de l'utilisateur, ramené sur DEP pour un compte
 * limité aux DEP (`opportunityOpenAccess === false`), qui n'a pas accès au standard.
 */
export function useOpportunityScope(): { scope: PartnerOpportunityScope; canStandard: boolean } {
  const { user } = useAuth();
  const filters = useOpportunitiesFilters();
  const canStandard = canAccessPartnerOpportunitiesStandard(user);
  return { scope: canStandard ? filters.scope : 'DEP', canStandard };
}
