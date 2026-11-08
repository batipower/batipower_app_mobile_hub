import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';

import { openOpportunityBrandPicker } from '../navigation';
import { NavRow, ToggleRow } from '../shared/SheetRows';
import {
  clearOpportunitiesFilters,
  countActiveOpportunitiesFilters,
  patchOpportunitiesFilters,
  useOpportunitiesFilters,
} from './filtersStore';

/** Filtres secondaires des opportunités : marque, et « non lues » sur les ouvertes. */
export function OpportunityFiltersSheet() {
  const filters = useOpportunitiesFilters();

  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        disabled: countActiveOpportunitiesFilters(filters) === 0,
        onPress: clearOpportunitiesFilters,
      }}
    >
      <SheetSection title="Marque">
        <NavRow
          label="Marque"
          value={filters.brand ?? 'Toutes'}
          onPress={openOpportunityBrandPicker}
        />
      </SheetSection>

      {filters.status === 'OPEN' ? (
        <SheetSection title="Lecture">
          <ToggleRow
            label="Non lues uniquement"
            value={filters.unreadOnly}
            onChange={(value) => patchOpportunitiesFilters({ unreadOnly: value })}
          />
        </SheetSection>
      ) : null}
    </SheetScreen>
  );
}
