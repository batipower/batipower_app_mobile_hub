import { BrandFilterSheet } from '../shared/BrandFilterSheet';
import { patchOpportunitiesFilters, useOpportunitiesFilters } from './filtersStore';
import { useOpportunityBrands } from './hooks/useOpportunityBrands';
import { useOpportunityScope } from './hooks/useOpportunityScope';

/** Choix de la marque des opportunités du périmètre affiché. */
export function OpportunityBrandSheet() {
  const filters = useOpportunitiesFilters();
  const { scope } = useOpportunityScope();
  const brands = useOpportunityBrands(scope);

  return (
    <BrandFilterSheet
      brands={brands.data}
      loading={brands.isPending}
      error={brands.error}
      selected={filters.brand}
      onSelect={(brand) => patchOpportunitiesFilters({ brand })}
      onRetry={() => void brands.refetch()}
    />
  );
}
