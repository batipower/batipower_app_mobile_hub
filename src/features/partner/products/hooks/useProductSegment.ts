import { useAuth } from '@/auth/AuthProvider';
import { canAccessPartnerProductsCatalog } from '@/auth/permissions';

import { useProductsFilters, type ProductSegment } from '../filtersStore';

/**
 * Périmètre effectif des Produits : le choix de l'utilisateur, ramené sur DEP quand le catalogue
 * standard est fermé à son compte (`productsCatalogAccess === false`).
 */
export function useProductSegment(): { segment: ProductSegment; canStandard: boolean } {
  const { user } = useAuth();
  const filters = useProductsFilters();
  const canStandard = canAccessPartnerProductsCatalog(user);
  return { segment: canStandard ? filters.segment : 'dep', canStandard };
}
