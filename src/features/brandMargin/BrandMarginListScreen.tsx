import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SlidersHorizontal, Tags, X } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubBrandMargin } from '@/auth/permissions';
import { FilterPill } from '@/components/sheet/FilterPill';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { formatEuroWhole, formatInteger } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';

import { BrandCard } from './components/BrandCard';
import { Kpi, KpiGrid } from './components/primitives';
import {
  countActiveBrandMarginFilters,
  patchBrandMarginFilters,
  resetBrandMarginFilters,
  useBrandMarginFilters,
} from './filtersStore';
import { useBrandMarginOverview } from './hooks/useBrandMarginOverview';
import { formatIsoDate, formatRate, marginColor, viewLabel } from './lib/display';
import {
  PERIOD_PRESETS,
  filterByOrigin,
  marginOf,
  originLabel,
  sortRows,
  type BrandMarginRow,
  type MarginView,
} from './lib/model';
import { openBrand, openBrandMarginFilters } from './navigation';

const VIEW_SEGMENTS = [
  { key: 'net', label: viewLabel('net') },
  { key: 'gross', label: viewLabel('gross') },
] as const satisfies readonly { key: MarginView; label: string }[];

const keyExtractor = (row: BrandMarginRow) => row.brand;

/** Marge de chaque marque (période, marketplace, avec / sans SAV), réservée aux SUPERADMIN. */
export function BrandMarginListScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubBrandMargin(user.role) ? (
    <BrandMarginList />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="La marge par marque est réservée aux comptes Super Admin."
    />
  );
}

function BrandMarginList() {
  const styles = useStyles();
  const t = useTheme();
  const filters = useBrandMarginFilters();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  const overview = useBrandMarginOverview(filters.period, true);
  const { refreshing, onRefresh } = usePullToRefresh(overview.refetch);
  const activeCount = countActiveBrandMarginFilters(filters);
  const periodLabel = PERIOD_PRESETS.find((preset) => preset.id === filters.period)?.label;

  const scope = useMemo(
    () => (overview.data ? filterByOrigin(overview.data, filters.origin) : null),
    [overview.data, filters.origin],
  );

  const rows = useMemo(() => {
    if (!scope) return [];
    const needle = normalizeForSearch(term);
    const matching = needle
      ? scope.rows.filter((row) => normalizeForSearch(row.brand).includes(needle))
      : scope.rows;
    return sortRows(matching, filters.sort, filters.desc, filters.view);
  }, [scope, term, filters.sort, filters.desc, filters.view]);

  const open = useCallback((brand: string) => openBrand(brand), []);

  const totals = scope?.totals ?? null;
  const margin = totals ? marginOf(totals, filters.view) : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filtres${activeCount > 0 ? `, ${activeCount} actif${activeCount > 1 ? 's' : ''}` : ''}`}
              hitSlop={6}
              onPress={openBrandMarginFilters}
              style={styles.headerButton}
            >
              <SlidersHorizontal size={20} color={t.accentText} />
              {activeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder="Rechercher une marque"
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
      />
      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <BrandCard
              row={item}
              average={totals ?? item.totals}
              view={filters.view}
              onPress={open}
            />
          </View>
        )}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        windowSize={9}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <SegmentedControl
              segments={VIEW_SEGMENTS}
              value={filters.view}
              onChange={(view) => patchBrandMarginFilters({ view })}
            />

            <View style={styles.chips}>
              <FilterPill
                label={periodLabel ?? 'Période'}
                state="off"
                onPress={openBrandMarginFilters}
              />
              {filters.origin ? (
                <FilterPill
                  label={originLabel(filters.origin)}
                  state="on"
                  onPress={() => patchBrandMarginFilters({ origin: null })}
                  trailing={<X size={12} color={t.accentText} />}
                />
              ) : null}
              {activeCount > 0 ? (
                <FilterPill label="Réinitialiser" state="off" onPress={resetBrandMarginFilters} />
              ) : null}
            </View>

            {totals && margin ? (
              <KpiGrid>
                <Kpi label="CA HT" value={formatEuroWhole(totals.caHT)} />
                <Kpi
                  label={`Marge ${filters.view === 'net' ? 'nette' : 'brute'}`}
                  value={formatEuroWhole(margin.value)}
                  hint={formatRate(margin.rate)}
                  color={marginColor(t, margin.value)}
                />
                <Kpi
                  label="Impact SAV"
                  value={formatEuroWhole(totals.sav.totalHT)}
                  hint={`${formatInteger(totals.orders)} commandes`}
                />
                <Kpi
                  label="Marques"
                  value={formatInteger(scope?.rows.length)}
                  hint={
                    overview.data
                      ? `${formatIsoDate(overview.data.period.from)} → ${formatIsoDate(overview.data.period.to)}`
                      : undefined
                  }
                />
              </KpiGrid>
            ) : null}

            <View style={styles.summary}>
              <Text style={styles.total}>
                {overview.data
                  ? `${formatInteger(rows.length)} marque${rows.length > 1 ? 's' : ''}`
                  : 'Chargement…'}
                {term ? ` · « ${term} »` : ''}
              </Text>
              {overview.isRefetching ? (
                <ActivityIndicator size="small" color={t.accentText} />
              ) : null}
            </View>

            {overview.error && overview.data ? (
              <ErrorBanner
                error={overview.error}
                fallback="Impossible de charger les marges"
                onRetry={() => void onRefresh()}
              />
            ) : null}
            {overview.data && overview.data.coverage.incompleteOrders > 0 ? (
              <Text style={styles.coverage}>
                {`${formatInteger(overview.data.coverage.incompleteOrders)} commandes sans prix d'achat, poids ou grille de transport : marge estimée.`}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          overview.loading ? (
            <View style={styles.cardWrap}>
              <ListSkeleton rows={4} height={140} />
            </View>
          ) : overview.error ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={overview.error}
                fallback="Impossible de charger les marges"
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : (
            <EmptyState
              icon={<Tags size={24} color={t.textMuted} />}
              title="Aucune marque"
              text={
                term || filters.origin
                  ? 'Aucune marque ne correspond à ces filtres.'
                  : "Aucune vente n'a été trouvée sur cette période."
              }
            />
          )
        }
      />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: spacing['4xl'] },
  header: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  total: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: t.text },
  coverage: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  headerButton: {
    width: hitTarget - 4,
    height: hitTarget - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: t.onAccent },
}));
