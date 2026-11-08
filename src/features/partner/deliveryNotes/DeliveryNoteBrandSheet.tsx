import { BrandFilterSheet } from '../shared/BrandFilterSheet';
import { patchDeliveryNotesFilters, useDeliveryNotesFilters } from './filtersStore';
import { useDeliveryNoteBrands } from './hooks/useDeliveryNoteBrands';

/** Choix de la marque des BL à corriger. */
export function DeliveryNoteBrandSheet() {
  const filters = useDeliveryNotesFilters();
  const brands = useDeliveryNoteBrands();
  return (
    <BrandFilterSheet
      brands={brands.data}
      loading={brands.isPending}
      error={brands.error}
      selected={filters.brand}
      onSelect={(brand) => patchDeliveryNotesFilters({ brand })}
      onRetry={() => void brands.refetch()}
    />
  );
}
