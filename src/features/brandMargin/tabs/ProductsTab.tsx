import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { PackageSearch } from 'lucide-react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { EmptyState } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { HubBrandMarginProduct } from '@/types/hubBrandMargin';

import { ProductRow, ShowMoreButton, useShowMore } from '../components/rows';
import { marginOf, type MarginView } from '../lib/model';

type ProductSort = 'worst' | 'margin' | 'caHT' | 'siteRate' | 'sav';

const SORTS: readonly { key: ProductSort; label: string }[] = [
  { key: 'worst', label: 'Pires marges' },
  { key: 'margin', label: 'Meilleures marges' },
  { key: 'caHT', label: 'CA' },
  { key: 'siteRate', label: 'Taux site' },
  { key: 'sav', label: 'Impact SAV' },
];

type ProductsTabProps = {
  products: readonly HubBrandMarginProduct[];
  view: MarginView;
};

/**
 * Marge par produit de la marque : pires marges d'abord, recherche par référence ou désignation,
 * option « marge négative », taux de marge site, monitoring, expédition et SAV par cause.
 */
export function ProductsTab({ products, view }: ProductsTabProps) {
  const styles = useStyles();
  const t = useTheme();
  const [sort, setSort] = useState<ProductSort>('worst');
  const [lossOnly, setLossOnly] = useState(false);
  const [savCauses, setSavCauses] = useState(false);
  const [search, setSearch] = useState('');

  const lossCount = useMemo(
    () => products.filter((product) => marginOf(product, view).value < 0).length,
    [products, view],
  );

  const rows = useMemo(() => {
    const needle = normalizeForSearch(search);
    const list = products.filter((product) => {
      if (lossOnly && marginOf(product, view).value >= 0) return false;
      if (!needle) return true;
      return (
        normalizeForSearch(product.reference).includes(needle) ||
        normalizeForSearch(product.designation ?? '').includes(needle)
      );
    });
    const value = (product: HubBrandMarginProduct) => {
      switch (sort) {
        case 'caHT':
          return product.caHT;
        case 'siteRate':
          return product.site?.marginRate ?? Number.NEGATIVE_INFINITY;
        case 'sav':
          return product.sav.totalHT;
        default:
          return marginOf(product, view).value;
      }
    };
    return list.sort((a, b) => (sort === 'worst' ? value(a) - value(b) : value(b) - value(a)));
  }, [products, view, sort, lossOnly, search]);

  const more = useShowMore(rows);

  return (
    <View style={styles.root}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Référence ou désignation" />
      <View style={styles.chips}>
        {SORTS.map((option) => (
          <FilterPill
            key={option.key}
            label={option.label}
            state={sort === option.key ? 'on' : 'off'}
            onPress={() => setSort(option.key)}
          />
        ))}
        <FilterPill
          label={`Marge négative (${lossCount})`}
          state={lossOnly ? 'negative' : 'off'}
          onPress={() => setLossOnly((current) => !current)}
        />
        <FilterPill
          label="SAV par cause"
          state={savCauses ? 'on' : 'off'}
          onPress={() => setSavCauses((current) => !current)}
        />
      </View>
      <Text style={styles.count}>
        {`${formatInteger(rows.length)} produit${rows.length > 1 ? 's' : ''} sur ${formatInteger(products.length)}`}
      </Text>

      {rows.length === 0 ? (
        <EmptyState
          icon={<PackageSearch size={24} color={t.textMuted} />}
          title="Aucun produit"
          text={
            lossOnly || search
              ? 'Aucun produit ne correspond à ces filtres.'
              : 'Aucune vente sur cette période.'
          }
        />
      ) : (
        <>
          {more.visible.map((product) => (
            <ProductRow
              key={product.reference}
              product={product}
              view={view}
              showSavCauses={savCauses}
            />
          ))}
          {more.hasMore ? (
            <ShowMoreButton remaining={more.remaining} onPress={more.showMore} />
          ) : null}
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  count: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
}));
