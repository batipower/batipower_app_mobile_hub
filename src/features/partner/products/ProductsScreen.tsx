import { useCallback, useMemo, useState } from 'react';
import { Boxes, X } from 'lucide-react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { useTheme } from '@/theme';
import type { PartnerProduct } from '@/types/partnerProducts';

import { openProduct, openProductFilters } from '../navigation';
import { FilterPillRow, PartnerListScreen } from '../shared/PartnerListScreen';
import { plural } from '../shared/pages';
import { ProductCard } from './components/ProductCard';
import { CRITICITE_META, warehouseLabel } from './constants';
import {
  countActiveProductsFilters,
  patchProductsFilters,
  useProductsFilters,
  type ProductSegment,
} from './filtersStore';
import { useProductList } from './hooks/useProductList';
import { useProductSegment } from './hooks/useProductSegment';
import { useThumbnails } from './hooks/useThumbnails';

const keyExtractor = (item: PartnerProduct) => item.uuid;

/**
 * Produits du module PARTNER : le catalogue standard (couverture de stock, criticité, messages)
 * et les produits en déstockage (DEP). Les comptes dont le catalogue standard est fermé n'ont
 * que la liste DEP, sans contrôle de segment.
 */
export function ProductsScreen() {
  const t = useTheme();
  const filters = useProductsFilters();
  const { segment, canStandard } = useProductSegment();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  const list = useProductList(segment, filters, term);
  const references = useMemo(() => list.items.map((item) => item.reference), [list.items]);
  const thumbs = useThumbnails(references);
  const activeCount = countActiveProductsFilters(filters, segment);

  const renderItem = useCallback(
    (item: PartnerProduct) => (
      <ProductCard item={item} thumb={thumbs[item.reference]} onPress={openProduct} />
    ),
    [thumbs],
  );

  const changeSegment = (next: ProductSegment) => {
    // Les marques et entrepôts ne sont pas les mêmes d'un périmètre à l'autre.
    patchProductsFilters({ segment: next, brand: null });
  };

  const pills = [
    filters.brand ? (
      <FilterPill
        key="brand"
        label={filters.brand}
        state="on"
        onPress={() => patchProductsFilters({ brand: null })}
        trailing={<X size={12} color={t.accentText} />}
      />
    ) : null,
    segment === 'standard' && filters.criticite ? (
      <FilterPill
        key="criticite"
        label={CRITICITE_META[filters.criticite].label}
        state="on"
        onPress={() => patchProductsFilters({ criticite: null })}
        trailing={<X size={12} color={t.accentText} />}
      />
    ) : null,
    segment === 'standard' && filters.awaitingMyReply ? (
      <FilterPill
        key="reply"
        label="Réponse attendue"
        state="on"
        onPress={() => patchProductsFilters({ awaitingMyReply: false })}
        trailing={<X size={12} color={t.accentText} />}
      />
    ) : null,
    segment === 'dep' && filters.depWarehouse ? (
      <FilterPill
        key="warehouse"
        label={warehouseLabel(filters.depWarehouse)}
        state="on"
        onPress={() => patchProductsFilters({ depWarehouse: null })}
        trailing={<X size={12} color={t.accentText} />}
      />
    ) : null,
  ].filter(Boolean);

  return (
    <PartnerListScreen
      title="Produits"
      list={list}
      totalLabel={
        list.total === null
          ? null
          : `${plural(list.total, 'produit')}${term ? ` · « ${term} »` : ''}`
      }
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      extraData={thumbs}
      segments={
        canStandard
          ? [
              { key: 'standard', label: 'Standard' },
              { key: 'dep', label: 'DEP' },
            ]
          : undefined
      }
      segment={segment}
      onSegmentChange={changeSegment}
      search={text}
      onSearchChange={setText}
      term={term}
      searchPlaceholder="Référence, désignation, marque"
      activeFilterCount={activeCount}
      onOpenFilters={openProductFilters}
      filterPills={pills.length > 0 ? <FilterPillRow>{pills}</FilterPillRow> : null}
      errorFallback="Impossible de charger les produits"
      emptyIcon={<Boxes size={24} color={t.textMuted} />}
      emptyTitle="Aucun produit"
      emptyText={
        segment === 'dep'
          ? "Aucun produit n'est en déstockage pour le moment."
          : "Aucun produit n'est disponible pour le moment."
      }
      emptyFilteredText="Aucun produit ne correspond à ces filtres."
      skeletonHeight={112}
    />
  );
}

