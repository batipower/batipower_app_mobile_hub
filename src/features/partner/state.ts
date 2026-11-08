import { resetDeliveryNotesFilters } from './deliveryNotes/filtersStore';
import { resetInterAgencyFilters } from './interAgency/filtersStore';
import { resetOpportunitiesFilters } from './opportunities/filtersStore';
import { resetProductsFilters } from './products/filtersStore';

/** Remet à zéro les filtres PARTNER à la déconnexion (comme les autres modules). */
export function resetPartnerState() {
  resetProductsFilters();
  resetOpportunitiesFilters();
  resetInterAgencyFilters();
  resetDeliveryNotesFilters();
}
