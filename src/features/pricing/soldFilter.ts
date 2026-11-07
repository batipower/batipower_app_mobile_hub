import type { HubPricingFilters } from '@/types/hubPricing';

/** Le filtre « ventes par canal » n'agit que si le canal ET la durée sont renseignés. */
export function isSoldFilterActive(
  filters: Pick<HubPricingFilters, 'soldChannel' | 'soldDays'>,
): boolean {
  return Boolean(filters.soldChannel) && filters.soldDays != null;
}
