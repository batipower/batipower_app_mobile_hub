import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';

import { openDeliveryNoteBrandPicker } from '../navigation';
import { NavRow } from '../shared/SheetRows';
import {
  clearDeliveryNotesFilters,
  useDeliveryNotesFilters,
} from './filtersStore';

/** Filtre des BL : la marque (la vue à traiter / traités se choisit sur la liste). */
export function DeliveryNoteFiltersSheet() {
  const filters = useDeliveryNotesFilters();
  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        disabled: !filters.brand,
        onPress: clearDeliveryNotesFilters,
      }}
    >
      <SheetSection title="Marque">
        <NavRow
          label="Marque"
          value={filters.brand ?? 'Toutes'}
          onPress={openDeliveryNoteBrandPicker}
        />
      </SheetSection>
    </SheetScreen>
  );
}
