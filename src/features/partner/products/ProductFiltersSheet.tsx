import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';

import { openProductBrandPicker } from '../navigation';
import { NavRow, OptionRow, ToggleRow } from '../shared/SheetRows';
import { CRITICITE_META, CRITICITE_ORDER, DEP_WAREHOUSES } from './constants';
import {
  clearProductsFilters,
  countActiveProductsFilters,
  patchProductsFilters,
  useProductsFilters,
} from './filtersStore';
import { useProductSegment } from './hooks/useProductSegment';

/** Filtres des produits : marque, puis criticité et réponse attendue (standard) ou entrepôt (DEP). */
export function ProductFiltersSheet() {
  const filters = useProductsFilters();
  const { segment } = useProductSegment();

  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        disabled: countActiveProductsFilters(filters, segment) === 0,
        onPress: clearProductsFilters,
      }}
    >
      <SheetSection title="Marque">
        <NavRow
          label="Marque"
          value={filters.brand ?? 'Toutes'}
          onPress={openProductBrandPicker}
        />
      </SheetSection>

      {segment === 'standard' ? (
        <>
          <SheetSection title="Criticité du stock">
            <OptionRow
              label="Toutes"
              selected={filters.criticite === null}
              onPress={() => patchProductsFilters({ criticite: null })}
            />
            {CRITICITE_ORDER.map((level) => (
              <OptionRow
                key={level}
                label={CRITICITE_META[level].label}
                selected={filters.criticite === level}
                onPress={() => patchProductsFilters({ criticite: level })}
              />
            ))}
          </SheetSection>
          <SheetSection title="Messages">
            <ToggleRow
              label="Réponse attendue de ma part"
              value={filters.awaitingMyReply}
              onChange={(value) => patchProductsFilters({ awaitingMyReply: value })}
            />
          </SheetSection>
        </>
      ) : (
        <SheetSection title="Entrepôt">
          <OptionRow
            label="Tous"
            selected={filters.depWarehouse === null}
            onPress={() => patchProductsFilters({ depWarehouse: null, brand: null })}
          />
          {DEP_WAREHOUSES.map((warehouse) => (
            <OptionRow
              key={warehouse.value}
              label={warehouse.label}
              selected={filters.depWarehouse === warehouse.value}
              onPress={() => patchProductsFilters({ depWarehouse: warehouse.value, brand: null })}
            />
          ))}
        </SheetSection>
      )}
    </SheetScreen>
  );
}
