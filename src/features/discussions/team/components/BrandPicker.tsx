import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Tag, X } from 'lucide-react-native';

import { discussionsApi } from '@/api/discussions';
import { errorMessage } from '@/features/preparation/components/ListState';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { teamPickerKey } from '../../queryKeys';
import { SearchField } from './SearchField';

type BrandPickerProps = {
  /** Marque choisie (texte libre : le back la normalise en majuscules). */
  value: string;
  onChange: (brand: string) => void;
};

/**
 * Choix de la marque d'une discussion : suggestions issues de `discussions/brands`, ou saisie
 * libre (« Utiliser … »), comme `BrandPickerCombobox` du web.
 */
export function BrandPicker({ value, onChange }: BrandPickerProps) {
  const styles = useStyles();
  const t = useTheme();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  const query = useQuery({
    queryKey: teamPickerKey('brands', term),
    queryFn: ({ signal }) =>
      discussionsApi.searchBrands({ search: term || undefined, limit: 30 }, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: !value,
  });

  if (value) {
    return (
      <View style={styles.selected}>
        <Tag size={16} color={t.accentText} />
        <Text style={styles.selectedText} numberOfLines={1}>
          {value}
        </Text>
        <Pressable
          onPress={() => {
            onChange('');
            setText('');
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Changer de marque (actuellement ${value})`}
          style={styles.change}
        >
          <X size={16} color={t.textMuted} />
        </Pressable>
      </View>
    );
  }

  const custom = text.trim();
  const results = query.data ?? [];
  const exactMatch = results.some((b) => b.name.toLowerCase() === custom.toLowerCase());

  return (
    <View style={styles.root}>
      <SearchField
        value={text}
        onChangeText={setText}
        placeholder="Rechercher ou saisir une marque"
        onSubmitEditing={() => {
          if (custom) onChange(custom.toUpperCase());
        }}
      />
      <View style={styles.list}>
        {custom.length > 0 && !exactMatch ? (
          <Pressable
            onPress={() => onChange(custom.toUpperCase())}
            accessibilityRole="button"
            accessibilityLabel={`Utiliser la marque ${custom}`}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Plus size={16} color={t.accentText} />
            <Text style={styles.rowText} numberOfLines={1}>
              Utiliser « {custom.toUpperCase()} »
            </Text>
          </Pressable>
        ) : null}
        {query.isPending ? (
          <View style={styles.state}>
            <ActivityIndicator color={t.accentText} />
          </View>
        ) : query.error && results.length === 0 ? (
          <Text style={styles.stateText} accessibilityRole="alert">
            {errorMessage(query.error, 'Impossible de charger les marques.')}
          </Text>
        ) : results.length === 0 && custom.length === 0 ? (
          <Text style={styles.stateText}>Aucune marque trouvée.</Text>
        ) : (
          results.map((brand) => (
            <Pressable
              key={brand.name}
              onPress={() => onChange(brand.name)}
              accessibilityRole="button"
              accessibilityLabel={`${brand.name}, ${brand.productCount} produit${brand.productCount > 1 ? 's' : ''}`}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Tag size={16} color={t.textSubtle} />
              <Text style={[styles.rowText, styles.brandName]} numberOfLines={1}>
                {brand.name}
              </Text>
              <Text style={styles.count}>
                {brand.productCount} produit{brand.productCount > 1 ? 's' : ''}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  selected: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.5),
    backgroundColor: withAlpha(t.accent, 0.12),
  },
  selectedText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.text,
  },
  change: { width: hitTarget, height: hitTarget, alignItems: 'center', justifyContent: 'center' },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
  },
  row: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: { backgroundColor: t.surfaceStrong },
  rowText: { flex: 1, fontSize: fontSize.sm, color: t.text },
  brandName: { fontWeight: '600', textTransform: 'uppercase' },
  count: { fontSize: 11, color: t.textMuted },
  state: { padding: spacing['2xl'], alignItems: 'center' },
  stateText: { padding: spacing.lg, fontSize: fontSize.xs, textAlign: 'center', color: t.textMuted },
}));
