import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

import { EmptyState, ErrorBanner } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

export type SelectOption = {
  value: string;
  label: string;
  /** Deuxième ligne discrète (distributeur d'une filiale…). */
  detail?: string;
  /** Option affichée mais non sélectionnable (entrepôt sans filiale…). */
  disabled?: boolean;
};

type SelectSheetProps = {
  visible: boolean;
  title: string;
  options: SelectOption[];
  /** Valeurs choisies (une seule pour un choix simple). */
  selected: string[];
  multiple?: boolean;
  searchable?: boolean;
  loading?: boolean;
  error?: unknown;
  /** Libellé du choix « aucun » d'un choix simple (valeur vide). */
  noneLabel?: string;
  onToggle: (value: string) => void;
  onClose: () => void;
  onRetry?: () => void;
};

/**
 * Feuille de choix des formulaires ADMIN : recherche, choix simple (ferme à la sélection) ou
 * multiple (bouton « OK »). Présentée en `Modal` natif : elle s'ouvre par-dessus un formulaire sans
 * route supplémentaire, donc sans faire transiter la valeur par les paramètres d'URL.
 */
export function SelectSheet({
  visible,
  title,
  options,
  selected,
  multiple = false,
  searchable = true,
  loading = false,
  error,
  noneLabel,
  onToggle,
  onClose,
  onRetry,
}: SelectSheetProps) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const visibleOptions = useMemo(() => {
    const needle = normalizeForSearch(search);
    return needle
      ? options.filter((o) => normalizeForSearch(`${o.label} ${o.detail ?? ''}`).includes(needle))
      : options;
  }, [options, search]);

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    onToggle(option.value);
    if (!multiple) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={() => setSearch('')}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.side} />
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <View style={[styles.side, styles.sideEnd]}>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose}>
              <Text style={styles.close}>{multiple ? 'OK' : 'Fermer'}</Text>
            </Pressable>
          </View>
        </View>
        {searchable ? (
          <View style={styles.search}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher" />
          </View>
        ) : null}
        {error ? (
          <View style={styles.search}>
            <ErrorBanner
              error={error}
              fallback="Impossible de charger la liste"
              onRetry={onRetry ?? (() => undefined)}
            />
          </View>
        ) : null}
        <FlatList
          data={visibleOptions}
          keyExtractor={(item, index) => `${item.value}-${index}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['2xl'] }]}
          ListHeaderComponent={
            !multiple && noneLabel ? (
              <Row
                label={noneLabel}
                selected={selected.length === 0 || selected[0] === ''}
                onPress={() => choose({ value: '', label: noneLabel })}
              />
            ) : undefined
          }
          renderItem={({ item }) => (
            <Row
              label={item.label}
              detail={item.detail}
              disabled={item.disabled}
              selected={selected.includes(item.value)}
              onPress={() => choose(item)}
            />
          )}
          ListEmptyComponent={
            loading ? undefined : (
              <EmptyState icon={<Check size={24} color={t.textMuted} />} title="Aucun résultat" />
            )
          }
        />
      </View>
    </Modal>
  );
}

function Row({
  label,
  detail,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: t.surface },
        disabled && { opacity: 0.45 },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} numberOfLines={2}>
          {label}
        </Text>
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={18} color={t.accentText} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bgElevated },
  header: {
    minHeight: hitTarget + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  side: { minWidth: 70 },
  sideEnd: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  close: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  search: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.xl },
  row: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  rowDetail: { fontSize: fontSize.xs, color: t.textMuted },
}));
