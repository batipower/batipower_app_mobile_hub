import { Text, View } from 'react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { fontSize, makeStyles, spacing } from '@/theme';

import {
  EMPTY_FACET_FILTERS,
  hasActiveFacetFilters,
  NO_AFFAIRE,
  STOCK_WAREHOUSE_OPTIONS,
  type FacetFilters,
  type StockMode,
  type StockWarehouse,
} from '../domain/facets';
import { useStudioQueue } from '../hooks/useStudioQueue';
import { patchQueueFilters, useQueueFilters } from '../queueFiltersStore';

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Filtres marque, service, affaire et stock de la file (OU dans un filtre, ET entre filtres). */
export function FacetFiltersSheet() {
  const styles = useStyles();
  const { facets } = useQueueFilters();
  const { facetOptions } = useStudioQueue();

  const set = (partial: Partial<FacetFilters>) =>
    patchQueueFilters({ facets: { ...facets, ...partial } });

  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        disabled: !hasActiveFacetFilters(facets),
        onPress: () => patchQueueFilters({ facets: EMPTY_FACET_FILTERS }),
      }}
    >
      <SheetSection title="Marque">
        {facetOptions.brands.length === 0 ? (
          <Text style={styles.hint}>Aucune marque dans la liste.</Text>
        ) : (
          <View style={styles.wrap}>
            {facetOptions.brands.map((brand) => (
              <FilterPill
                key={brand.value}
                label={`${brand.value} · ${brand.count}`}
                state={facets.brands.includes(brand.value) ? 'on' : 'off'}
                onPress={() => set({ brands: toggle(facets.brands, brand.value) })}
              />
            ))}
          </View>
        )}
      </SheetSection>

      <SheetSection title="Service">
        {facetOptions.categoryTypes.length === 0 ? (
          <Text style={styles.hint}>Aucun service dans la liste.</Text>
        ) : (
          <View style={styles.wrap}>
            {facetOptions.categoryTypes.map((type) => (
              <FilterPill
                key={type.value}
                label={`${type.value} · ${type.count}`}
                state={facets.categoryTypes.includes(type.value) ? 'on' : 'off'}
                onPress={() => set({ categoryTypes: toggle(facets.categoryTypes, type.value) })}
              />
            ))}
          </View>
        )}
      </SheetSection>

      <SheetSection title="Affaire">
        <View style={styles.wrap}>
          {facetOptions.unassignedCount > 0 || facets.affaires.includes(NO_AFFAIRE) ? (
            <FilterPill
              label={`Sans affaire · ${facetOptions.unassignedCount}`}
              state={facets.affaires.includes(NO_AFFAIRE) ? 'on' : 'off'}
              onPress={() => set({ affaires: toggle(facets.affaires, NO_AFFAIRE) })}
            />
          ) : null}
          {facetOptions.affaires.map((affaire) => (
            <FilterPill
              key={affaire.id}
              label={`${affaire.name} · ${affaire.count}`}
              state={facets.affaires.includes(affaire.id) ? 'on' : 'off'}
              onPress={() => set({ affaires: toggle(facets.affaires, affaire.id) })}
            />
          ))}
        </View>
        {facetOptions.affaires.length === 0 && facetOptions.unassignedCount === 0 ? (
          <Text style={styles.hint}>Aucune affaire dans la liste.</Text>
        ) : null}
      </SheetSection>

      <SheetSection title="Stock">
        <SegmentedControl<StockMode>
          segments={[
            { key: 'all', label: 'Tous' },
            { key: 'with', label: 'Avec stock' },
            { key: 'without', label: 'Sans stock' },
          ]}
          value={facets.stock}
          onChange={(stock) =>
            set({ stock, stockWarehouse: stock === 'all' ? '' : facets.stockWarehouse })
          }
        />
        {facets.stock !== 'all' ? (
          <View style={styles.wrap}>
            <FilterPill
              label="Tous les entrepôts"
              state={facets.stockWarehouse === '' ? 'on' : 'off'}
              onPress={() => set({ stockWarehouse: '' })}
            />
            {STOCK_WAREHOUSE_OPTIONS.map((option) => (
              <FilterPill
                key={option.value}
                label={option.label}
                state={facets.stockWarehouse === option.value ? 'on' : 'off'}
                onPress={() => set({ stockWarehouse: option.value as StockWarehouse })}
              />
            ))}
          </View>
        ) : null}
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { fontSize: fontSize.xs, color: t.textMuted },
}));
