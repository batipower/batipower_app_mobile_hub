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
import { BrandMarginFootnote } from './components/Footnote';
import { BrandMarginKpis } from './components/MarginKpis';
import {
  countActiveBrandMarginFilters,
  patchBrandMarginFilters,
  resetBrandMarginFilters,
  useBrandMarginFilters,
} from './filtersStore';
import { useOverviewComparison } from './hooks/useBrandMarginComparison';
import { useBrandMarginOverview } from './hooks/useBrandMarginOverview';
import { useBrandMarginRange } from './hooks/useBrandMarginRange';
import { brandAlerts } from './lib/diagnostic';
import { formatIsoDate, viewLabel } from './lib/display';
import {
  filterByOrigin,
  marginOf,
  originLabel,
  periodShortLabel,
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

  const { range, error: periodProblem } = useBrandMarginRange(filters);
  const enabled = periodProblem == null;
  const overview = useBrandMarginOverview(range, filters.warehouses, enabled);
  const { refreshing, onRefresh } = usePullToRefresh(overview.refetch);
  const activeCount = countActiveBrandMarginFilters(filters);
  const periodLabel = periodShortLabel(filters.period);

  const scope = useMemo(
    () => (overview.data ? filterByOrigin(overview.data, filters.origin) : null),
    [overview.data, filters.origin],
  );

  const totals = scope?.totals ?? null;
  const comparison = useOverviewComparison(
    range,
    totals,
    filters.origin,
    filters.warehouses,
    enabled,
  );

  const rows = useMemo(() => {
    if (!scope) return [];
    const needle = normalizeForSearch(term);
    let matching = needle
      ? scope.rows.filter((row) => normalizeForSearch(row.brand).includes(needle))
      : scope.rows;
    if (filters.alertsOnly) {
      matching = matching.filter(
        (row) => brandAlerts(row.totals, scope.totals, filters.view).length > 0,
      );
    }
    return sortRows(matching, filters.sort, filters.desc, filters.view);
  }, [scope, term, filters.sort, filters.desc, filters.view, filters.alertsOnly]);

  // Marques à marge négative (et montant perdu) et marques en alerte, sur tout le périmètre.
  const summary = useMemo(() => {
    if (!scope) return { negative: 0, flagged: 0, lostHT: 0 };
    let negative = 0;
    let flagged = 0;
    let lostHT = 0;
    for (const row of scope.rows) {
      const margin = marginOf(row.totals, filters.view).value;
      if (margin < 0) {
        negative += 1;
        lostHT += margin;
      }
      if (brandAlerts(row.totals, scope.totals, filters.view).length > 0) flagged += 1;
    }
    return { negative, flagged, lostHT };
  }, [scope, filters.view]);

  const open = useCallback((brand: string) => openBrand(brand), []);

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
              showSavCauses={filters.showSavCauses}
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
              <FilterPill label={periodLabel} state="off" onPress={openBrandMarginFilters} />
              {filters.warehouses.length > 0 ? (
                <FilterPill
                  label={`${filters.warehouses.length} filiale${filters.warehouses.length > 1 ? 's' : ''}`}
                  state="on"
                  onPress={() => patchBrandMarginFilters({ warehouses: [] })}
                  trailing={<X size={12} color={t.accentText} />}
                />
              ) : null}
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

            {periodProblem ? <Text style={styles.problem}>{periodProblem}</Text> : null}

            {totals ? (
              <BrandMarginKpis totals={totals} view={filters.view} comparison={comparison} />
            ) : null}

            {overview.data && scope ? (
              <Text style={styles.coverage}>
                {`${formatInteger(overview.data.productCount)} produits vendus · du ${formatIsoDate(overview.data.period.from)} au ${formatIsoDate(overview.data.period.to)}${filters.origin ? ` · ${originLabel(filters.origin)}` : ''} · `}
                <Text style={summary.negative > 0 ? styles.bad : styles.strong}>
                  {`${formatInteger(summary.negative)} à marge négative`}
                </Text>
                {summary.negative > 0 ? ` (${formatEuroWhole(summary.lostHT)})` : ''}
                {' · '}
                <Text style={summary.flagged > 0 ? styles.warn : styles.strong}>
                  {`${formatInteger(summary.flagged)} en alerte`}
                </Text>
              </Text>
            ) : null}

            <View style={styles.chips}>
              <FilterPill
                label="Seulement les marques en alerte"
                state={filters.alertsOnly ? 'on' : 'off'}
                onPress={() => patchBrandMarginFilters({ alertsOnly: !filters.alertsOnly })}
              />
              <FilterPill
                label="SAV par cause"
                state={filters.showSavCauses ? 'on' : 'off'}
                onPress={() => patchBrandMarginFilters({ showSavCauses: !filters.showSavCauses })}
              />
            </View>

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
          </View>
        }
        ListFooterComponent={
          overview.data ? (
            <View style={styles.footer}>
              <BrandMarginFootnote coverage={overview.data.coverage} />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          periodProblem ? (
            <></>
          ) : overview.loading ? (
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
                term || filters.origin || filters.alertsOnly || filters.warehouses.length > 0
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
  strong: { fontWeight: '700', color: t.text },
  bad: { fontWeight: '700', color: t.danger },
  warn: { fontWeight: '700', color: t.warning },
  problem: { fontSize: fontSize.sm, color: t.danger },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
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
