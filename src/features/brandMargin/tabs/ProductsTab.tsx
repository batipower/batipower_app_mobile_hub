import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { PackageSearch } from 'lucide-react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { EmptyState } from '@/features/preparation/components/ListState';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { HubBrandMarginProduct } from '@/types/hubBrandMargin';

import { ProductRow, ShowMoreButton, useShowMore } from '../components/rows';
import { marginOf, type MarginView } from '../lib/model';

type ProductSort = 'worst' | 'margin' | 'caHT';

const SORTS: readonly { key: ProductSort; label: string }[] = [
  { key: 'worst', label: 'Pires marges' },
  { key: 'margin', label: 'Meilleures marges' },
  { key: 'caHT', label: 'CA' },
];

type ProductsTabProps = {
  products: readonly HubBrandMarginProduct[];
  view: MarginView;
};

/** Marge par produit de la marque : pires marges d'abord, option « à perte seulement ». */
export function ProductsTab({ products, view }: ProductsTabProps) {
  const styles = useStyles();
  const t = useTheme();
  const [sort, setSort] = useState<ProductSort>('worst');
  const [lossOnly, setLossOnly] = useState(false);

  const lossCount = useMemo(
    () => products.filter((product) => marginOf(product, view).value < 0).length,
    [products, view],
  );

  const rows = useMemo(() => {
    const list = lossOnly
      ? products.filter((product) => marginOf(product, view).value < 0)
      : [...products];
    const value = (product: HubBrandMarginProduct) =>
      sort === 'caHT' ? product.caHT : marginOf(product, view).value;
    return list.sort((a, b) =>
      sort === 'margin' || sort === 'caHT' ? value(b) - value(a) : value(a) - value(b),
    );
  }, [products, view, sort, lossOnly]);

  const more = useShowMore(rows);

  return (
    <View style={styles.root}>
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
          label={`À perte (${lossCount})`}
          state={lossOnly ? 'negative' : 'off'}
          onPress={() => setLossOnly((current) => !current)}
        />
      </View>
      <Text
        style={styles.count}
      >{`${formatInteger(rows.length)} produit${rows.length > 1 ? 's' : ''}`}</Text>

      {rows.length === 0 ? (
        <EmptyState
          icon={<PackageSearch size={24} color={t.textMuted} />}
          title="Aucun produit"
          text={lossOnly ? 'Aucun produit vendu à perte.' : 'Aucune vente sur cette période.'}
        />
      ) : (
        <>
          {more.visible.map((product) => (
            <ProductRow key={product.reference} product={product} view={view} />
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
