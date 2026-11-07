import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';

import { discussionsApi } from '@/api/discussions';
import { errorMessage } from '@/features/preparation/components/ListState';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import {
  fontSize,
  makeStyles,
  monoFontFamily,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import type { DiscussionProductSearchResult } from '@/types/discussions';

import { teamPickerKey } from '../../queryKeys';
import { categoryTypeLabel } from '../../shared/format';
import { SearchField } from './SearchField';
import { SelectableRow } from './SelectableRow';

type ProductRowProps = {
  product: DiscussionProductSearchResult;
  selected: boolean;
  onToggle: (product: DiscussionProductSearchResult) => void;
};

const ProductRow = memo(function ProductRow({ product, selected, onToggle }: ProductRowProps) {
  const styles = useStyles();
  const detail = [product.brand, categoryTypeLabel(product.categoryType)]
    .filter(Boolean)
    .join(' · ');
  return (
    <SelectableRow
      selected={selected}
      onPress={() => onToggle(product)}
      accessibilityLabel={`${product.reference}${product.designation ? `, ${product.designation}` : ''}`}
    >
      <View style={styles.texts}>
        <Text style={styles.reference}>{product.reference}</Text>
        {product.designation ? (
          <Text style={styles.designation} numberOfLines={2}>
            {product.designation}
          </Text>
        ) : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </SelectableRow>
  );
});

type ProductPickerProps = {
  selected: readonly DiscussionProductSearchResult[];
  onChange: (products: DiscussionProductSearchResult[]) => void;
};

/** Sélection multiple de produits (`discussions/products`) pour une discussion « Sélection produits ». */
export function ProductPicker({ selected, onChange }: ProductPickerProps) {
  const styles = useStyles();
  const t = useTheme();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  const query = useQuery({
    queryKey: teamPickerKey('products', term),
    queryFn: ({ signal }) =>
      discussionsApi.searchProducts({ search: term || undefined, limit: 30 }, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const selectedRefs = useMemo(() => new Set(selected.map((p) => p.reference)), [selected]);
  const results = query.data ?? [];

  const toggle = (product: DiscussionProductSearchResult) => {
    if (selectedRefs.has(product.reference)) {
      onChange(selected.filter((p) => p.reference !== product.reference));
    } else {
      onChange([...selected, product]);
    }
  };

  return (
    <View style={styles.root}>
      <SearchField
        value={text}
        onChangeText={setText}
        placeholder="Référence, désignation ou marque"
      />

      {selected.length > 0 ? (
        <View style={styles.chips}>
          {selected.map((product) => (
            <Pressable
              key={product.reference}
              onPress={() => toggle(product)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Retirer ${product.reference}`}
              style={styles.chip}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {product.reference}
              </Text>
              <X size={13} color={t.accentText} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.list}>
        {query.isPending ? (
          <View style={styles.state}>
            <ActivityIndicator color={t.accentText} />
          </View>
        ) : query.error && results.length === 0 ? (
          <Text style={styles.stateText} accessibilityRole="alert">
            {errorMessage(query.error, 'Impossible de rechercher les produits.')}
          </Text>
        ) : results.length === 0 ? (
          <Text style={styles.stateText}>
            {term ? 'Aucun produit ne correspond.' : 'Saisissez une référence ou une désignation.'}
          </Text>
        ) : (
          results.map((product) => (
            <ProductRow
              key={product.reference}
              product={product}
              selected={selectedRefs.has(product.reference)}
              onToggle={toggle}
            />
          ))
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    maxWidth: '100%',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.5),
    backgroundColor: withAlpha(t.accent, 0.14),
  },
  chipText: {
    flexShrink: 1,
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontFamily: monoFontFamily,
    color: t.accentText,
  },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
  },
  state: { padding: spacing['2xl'], alignItems: 'center' },
  stateText: { padding: spacing.lg, fontSize: fontSize.xs, textAlign: 'center', color: t.textMuted },
  texts: { gap: 2 },
  reference: { fontSize: fontSize.xs, fontWeight: '700', fontFamily: monoFontFamily, color: t.accentText },
  designation: { fontSize: fontSize.xs, color: t.text },
  detail: { fontSize: 11, color: t.textMuted },
}));
