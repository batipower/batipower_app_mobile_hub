import { ScrollView } from 'react-native';

import { makeStyles, spacing } from '@/theme';

import { isQgStockFilter } from '../filters';
import { patchPricingFilters, usePricingState } from '../filtersStore';
import { FilterPill } from '@/components/sheet/FilterPill';

/** Cycle des filtres à trois états : neutre → oui → non → neutre. */
function nextTriState(current: boolean | null): boolean | null {
  if (current === null) return true;
  return current === true ? false : null;
}

/** Raccourcis horizontaux des filtres les plus utilisés (FilterBar du web). */
export function QuickFilters() {
  const styles = useStyles();
  const { filters } = usePricingState();
  const qgStock = isQgStockFilter(filters);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <FilterPill
        label="Favoris"
        state={filters.favorite === true ? 'on' : 'off'}
        onPress={() => patchPricingFilters({ favorite: filters.favorite === true ? null : true })}
      />
      <FilterPill
        label={filters.monitorBuyBox === false ? 'Non surveillés' : 'Surveillés BuyBox'}
        state={filters.monitorBuyBox === null ? 'off' : filters.monitorBuyBox ? 'on' : 'negative'}
        onPress={() => patchPricingFilters({ monitorBuyBox: nextTriState(filters.monitorBuyBox) })}
      />
      <FilterPill
        label={filters.handlingRestricted === false ? 'Non bloqués' : 'Bloqués'}
        state={
          filters.handlingRestricted === null
            ? 'off'
            : filters.handlingRestricted
              ? 'on'
              : 'negative'
        }
        onPress={() =>
          patchPricingFilters({ handlingRestricted: nextTriState(filters.handlingRestricted) })
        }
      />
      <FilterPill
        label={filters.notOnWebsite === false ? 'Déployés site' : 'Non déployés site'}
        state={
          filters.notOnWebsite === null ? 'off' : filters.notOnWebsite ? 'on' : 'negative'
        }
        onPress={() => patchPricingFilters({ notOnWebsite: nextTriState(filters.notOnWebsite) })}
      />
      <FilterPill
        label="Vente à perte"
        state={filters.sellingAtLoss ? 'on' : 'off'}
        onPress={() => patchPricingFilters({ sellingAtLoss: !filters.sellingAtLoss })}
      />
      <FilterPill
        label="Stock QG"
        state={qgStock ? 'on' : 'off'}
        onPress={() =>
          patchPricingFilters(
            qgStock
              ? { hasStock: null, stockWarehouse: '' }
              : { hasStock: true, stockWarehouse: 'QG_BATIPOWER' },
          )
        }
      />
    </ScrollView>
  );
}

const useStyles = makeStyles(() => ({
  row: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center' },
}));
