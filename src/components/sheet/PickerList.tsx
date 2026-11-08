import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { EmptyState, ErrorBanner } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

export type PickerItem = { value: string; label: string };

const MAX_TAG_LENGTH = 30;

/** Nettoie un tag saisi (virgules et espaces multiples retirés, 30 caractères au plus). */
export function cleanTag(raw: string): string {
  return raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);
}

type PickerListProps = {
  title: string;
  items: PickerItem[];
  selected: string[];
  loading: boolean;
  error: unknown;
  multiple: boolean;
  onToggle: (value: string) => void;
  /** Autorise la création d'une valeur absente de la liste (tags d'une ligne). */
  creatable?: boolean;
  /** Libellé du choix « aucun » d'une liste à choix unique. */
  noneLabel?: string;
  footer?: ReactNode;
  closeLabel?: string;
  onRetry?: () => void;
};

/**
 * Feuille de choix générique : recherche, liste à sélection simple ou multiple, création
 * facultative d'une valeur. Partagée par les feuilles Pricing et Product Analyzer.
 */
export function PickerList({
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
  onRetry,
}: PickerListProps) {
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
            onRetry={onRetry ?? (() => undefined)}
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
                <PickerRow
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
            <PickerRow
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

function PickerRow({
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
