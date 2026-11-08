import { BrandFilterSheet } from '../shared/BrandFilterSheet';
import { patchProductsFilters, useProductsFilters } from './filtersStore';
import { useProductBrands } from './hooks/useProductBrands';
import { useProductSegment } from './hooks/useProductSegment';

/** Choix de la marque des produits (liste propre au périmètre standard ou DEP). */
export function ProductBrandSheet() {
  const filters = useProductsFilters();
  const { segment } = useProductSegment();
  const brands = useProductBrands(segment, segment === 'dep' ? filters.depWarehouse : null);

  return (
    <BrandFilterSheet
      brands={brands.data}
      loading={brands.isPending}
      error={brands.error}
      selected={filters.brand}
      onSelect={(brand) => patchProductsFilters({ brand })}
      onRetry={() => void brands.refetch()}
    />
  );
}
