import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { EmptyState, ErrorBanner } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import { SheetScreen } from './components/SheetScreen';
import { patchPricingFilters, usePricingState } from './filtersStore';
import { usePricingAffaires, usePricingBrands, usePricingTags } from './hooks/usePricingOptions';
import { usePricingRow } from './hooks/usePricingRow';
import { useUpdatePricingRow } from './hooks/useUpdatePricingRow';
import type { PricingPickerKind } from './navigation';

type Item = { value: string; label: string };

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

/** Nettoie un tag saisi (virgules et espaces multiples retirés, 30 caractères au plus). */
function cleanTag(raw: string): string {
  return raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);
}

type ListProps = {
  title: string;
  items: Item[];
  selected: string[];
  loading: boolean;
  error: unknown;
  multiple: boolean;
  onToggle: (value: string) => void;
  /** Autorise la création d'une valeur absente de la liste (tags d'une ligne). */
  creatable?: boolean;
  /** Libellé du choix « aucun » d'une liste à choix unique. */
  noneLabel?: string;
  footer?: React.ReactNode;
  closeLabel?: string;
};

function PickerList({
  title,
  items,
  selected,
  loading,
  error,
  multiple,
  onToggle,
  creatable = false,
  noneLabel,
  footer,
  closeLabel,
}: ListProps) {
  const styles = useStyles();
  const t = useTheme();
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = normalizeForSearch(search);
    // Les valeurs choisies mais absentes de la liste (tags créés) restent affichées en tête.
    const known = new Set(items.map((item) => item.value));
    const extra = selected
      .filter((value) => !known.has(value))
      .map((value) => ({ value, label: value }));
    const all = [...extra, ...items];
    return needle ? all.filter((item) => normalizeForSearch(item.label).includes(needle)) : all;
  }, [items, search, selected]);

  const candidate = creatable ? cleanTag(search) : '';
  const canCreate =
    candidate.length > 0 &&
    !visible.some((item) => item.label.toLowerCase() === candidate.toLowerCase());

  return (
    <SheetScreen title={title} scroll={false} footer={footer} closeLabel={closeLabel}>
      <View style={styles.search}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher" />
      </View>
      {loading ? (
        <ActivityIndicator color={t.accentText} style={styles.loader} />
      ) : error ? (
        <View style={styles.search}>
          <ErrorBanner
            error={error}
            fallback="Impossible de charger la liste"
            onRetry={() => undefined}
          />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {!multiple && noneLabel ? (
                <Row
                  label={noneLabel}
                  selected={selected.length === 0}
                  onPress={() => onToggle('')}
                />
              ) : null}
              {canCreate ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onToggle(candidate);
                    setSearch('');
                  }}
                  style={styles.row}
                >
                  <Plus size={18} color={t.accentText} />
                  <Text style={[styles.rowLabel, { color: t.accentText }]}>
                    Ajouter « {candidate} »
                  </Text>
                </Pressable>
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <Row
              label={item.label}
              selected={selected.includes(item.value)}
              onPress={() => onToggle(item.value)}
            />
          )}
          ListEmptyComponent={
            canCreate ? undefined : (
              <EmptyState icon={<Check size={24} color={t.textMuted} />} title="Aucun résultat" />
            )
          }
        />
      )}
    </SheetScreen>
  );
}

function Row({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
    >
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      {selected ? <Check size={18} color={t.accentText} /> : null}
    </Pressable>
  );
}

function BrandsPicker() {
  const { filters } = usePricingState();
  const { brands, loading, error } = usePricingBrands(filters.categoryTypes);
  const items = useMemo(() => brands.map((b) => ({ value: b, label: b })), [brands]);
  return (
    <PickerList
      title={filters.brands.length > 0 ? `Marques (${filters.brands.length})` : 'Marques'}
      items={items}
      selected={filters.brands}
      loading={loading}
      error={error}
      multiple
      onToggle={(value) =>
        patchPricingFilters({
          brands: filters.brands.includes(value)
            ? filters.brands.filter((b) => b !== value)
            : [...filters.brands, value],
        })
      }
    />
  );
}

function TagsPicker() {
  const { filters } = usePricingState();
  const { tags, loading, error } = usePricingTags();
  const items = useMemo(() => tags.map((tag) => ({ value: tag, label: tag })), [tags]);
  return (
    <PickerList
      title={filters.productTags.length > 0 ? `Tags (${filters.productTags.length})` : 'Tags'}
      items={items}
      selected={filters.productTags}
      loading={loading}
      error={error}
      multiple
      onToggle={(value) =>
        patchPricingFilters({
          productTags: filters.productTags.includes(value)
            ? filters.productTags.filter((tag) => tag !== value)
            : [...filters.productTags, value].slice(0, MAX_TAGS),
        })
      }
    />
  );
}

function AffairesPicker() {
  const { filters } = usePricingState();
  const { affaires, loading, error } = usePricingAffaires();
  const items = useMemo(() => affaires.map((a) => ({ value: a.uuid, label: a.name })), [affaires]);
  return (
    <PickerList
      title="Affaire"
      items={items}
      selected={filters.affaireId ? [filters.affaireId] : []}
      loading={loading}
      error={error}
      multiple={false}
      noneLabel="Toutes les affaires"
      onToggle={(value) => {
        patchPricingFilters({ affaireId: value === filters.affaireId ? '' : value });
        router.back();
      }}
    />
  );
}

/** Tags d'une ligne : brouillon local, enregistré d'un coup (PATCH `productTags`). */
function EditTagsPicker({ reference }: { reference: string }) {
  const { row } = usePricingRow(reference);
  const { tags, loading, error } = usePricingTags();
  const update = useUpdatePricingRow();
  const [draft, setDraft] = useState<string[] | null>(null);
  const current = draft ?? row?.productTags ?? [];
  const items = useMemo(() => tags.map((tag) => ({ value: tag, label: tag })), [tags]);

  const save = () => {
    update.mutate(
      { reference, payload: { productTags: current } },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <PickerList
      title={`Tags de ${reference}`}
      items={items}
      selected={current}
      loading={loading || !row}
      error={error}
      multiple
      creatable
      closeLabel="Annuler"
      onToggle={(value) =>
        setDraft(
          current.includes(value)
            ? current.filter((tag) => tag !== value)
            : [...current, value].slice(0, MAX_TAGS),
        )
      }
      footer={<Button label="Enregistrer" loading={update.isPending} onPress={save} />}
    />
  );
}

/** Feuille de choix : marques, tags et affaire du filtre, ou tags d'une ligne. */
export function PickerSheet() {
  const { kind, reference } = useLocalSearchParams<{
    kind: PricingPickerKind;
    reference?: string;
  }>();
  if (kind === 'brands') return <BrandsPicker />;
  if (kind === 'tags') return <TagsPicker />;
  if (kind === 'affaires') return <AffairesPicker />;
  if (kind === 'edit-tags' && reference) return <EditTagsPicker reference={reference} />;
  return null;
}

const useStyles = makeStyles((t) => ({
  search: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  loader: { paddingVertical: spacing['4xl'] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
  row: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  rowLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
}));
