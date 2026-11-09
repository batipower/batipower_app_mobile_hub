import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SlidersHorizontal, Tags } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubBrandMargin } from '@/auth/permissions';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { FilterPill } from '@/components/sheet/FilterPill';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import { BrandMarginFootnote } from './components/Footnote';
import { BrandMarginKpis } from './components/MarginKpis';
import { patchBrandMarginFilters, useBrandMarginFilters } from './filtersStore';
import { useBrandComparison } from './hooks/useBrandMarginComparison';
import { useBrandMarginDetail } from './hooks/useBrandMarginDetail';
import { useBrandMarginOverview } from './hooks/useBrandMarginOverview';
import { useBrandMarginRange } from './hooks/useBrandMarginRange';
import { useBrandStockQg } from './hooks/useBrandStockQg';
import { formatIsoDate, viewLabel } from './lib/display';
import { filterByOrigin, originLabel, periodShortLabel, type MarginView } from './lib/model';
import { openBrandMarginFilters } from './navigation';
import { OrdersTab } from './tabs/OrdersTab';
import { ProductsTab } from './tabs/ProductsTab';
import { SavTab } from './tabs/SavTab';
import { StockQgTab } from './tabs/StockQgTab';
import { SynthesisTab } from './tabs/SynthesisTab';

type TabKey = 'synthesis' | 'products' | 'orders' | 'sav' | 'stock';

const VIEW_SEGMENTS = [
  { key: 'net', label: viewLabel('net') },
  { key: 'gross', label: viewLabel('gross') },
] as const satisfies readonly { key: MarginView; label: string }[];

/** Fiche d'une marque (synthèse, produits, commandes, SAV), réservée aux SUPERADMIN. */
export function BrandMarginDetailScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubBrandMargin(user.role) ? (
    <BrandMarginDetail />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="La marge par marque est réservée aux comptes Super Admin."
    />
  );
}

function BrandMarginDetail() {
  const styles = useStyles();
  const t = useTheme();
  const { brand = '' } = useLocalSearchParams<{ brand: string }>();
  const filters = useBrandMarginFilters();
  const [tab, setTab] = useState<TabKey>('synthesis');

  const { range, error: periodProblem } = useBrandMarginRange(filters);
  const enabled = periodProblem == null;
  const detail = useBrandMarginDetail(brand, range, filters.origin, filters.warehouses, enabled);
  // Déjà en cache quand on vient de la liste ; sert à comparer la marque à la moyenne.
  const overview = useBrandMarginOverview(range, filters.warehouses, enabled);
  // Stock QG : instantané (ni période, ni canal), chargé aussi pour le compteur de l'onglet.
  const stock = useBrandStockQg(brand, true);
  const comparison = useBrandComparison(
    brand,
    range,
    detail.data?.totals ?? null,
    filters.origin,
    filters.warehouses,
    enabled,
  );
  const average = useMemo(
    () => (overview.data ? filterByOrigin(overview.data, filters.origin).totals : null),
    [overview.data, filters.origin],
  );

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([detail.refetch(), overview.refetch(), stock.refetch()]);
  });

  const periodLabel = periodShortLabel(filters.period);
  const data = detail.data;
  const tabs = useMemo(
    () =>
      [
        { key: 'synthesis', label: 'Synthèse' },
        { key: 'products', label: 'Produits', count: data?.products.length },
        { key: 'orders', label: 'Commandes', count: data?.ordersTotal },
        { key: 'sav', label: 'SAV', count: data?.savOrdersTotal },
        { key: 'stock', label: 'Stock QG', count: stock.data?.productsWithStock },
      ] as const,
    [data, stock.data],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: brand,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filtres"
              hitSlop={6}
              onPress={openBrandMarginFilters}
              style={styles.headerButton}
            >
              <SlidersHorizontal size={20} color={t.accentText} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
      >
        <SegmentedControl
          segments={VIEW_SEGMENTS}
          value={filters.view}
          onChange={(view) => patchBrandMarginFilters({ view })}
        />

        <View style={styles.summary}>
          <Text style={styles.period} numberOfLines={2}>
            {[
              periodLabel,
              data ? `${formatIsoDate(data.period.from)} → ${formatIsoDate(data.period.to)}` : null,
              filters.origin ? originLabel(filters.origin) : 'Toutes marketplaces',
              filters.warehouses.length > 0
                ? `${filters.warehouses.length} filiale${filters.warehouses.length > 1 ? 's' : ''}`
                : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
          {detail.isRefetching ? <ActivityIndicator size="small" color={t.accentText} /> : null}
        </View>

        {filters.origin ? (
          <View style={styles.chips}>
            <FilterPill
              label={`Retirer le filtre ${originLabel(filters.origin)}`}
              state="on"
              onPress={() => patchBrandMarginFilters({ origin: null })}
            />
          </View>
        ) : null}

        {periodProblem ? <Text style={styles.problem}>{periodProblem}</Text> : null}

        {data && data.totals.orders > 0 ? (
          <BrandMarginKpis totals={data.totals} view={filters.view} comparison={comparison} />
        ) : null}

        <SegmentedControl segments={tabs} value={tab} onChange={setTab} />

        {detail.error && data ? (
          <ErrorBanner
            error={detail.error}
            fallback="Impossible de charger la marque"
            onRetry={() => void onRefresh()}
          />
        ) : null}

        {tab === 'stock' ? (
          <StockQgTab
            data={stock.data}
            loading={stock.loading}
            error={stock.error}
            onRetry={() => void stock.refetch()}
          />
        ) : !data ? (
          periodProblem ? null : detail.loading ? (
            <ListSkeleton rows={4} height={120} />
          ) : (
            <ErrorBanner
              error={detail.error}
              fallback="Impossible de charger la marque"
              onRetry={() => void onRefresh()}
            />
          )
        ) : data.totals.orders === 0 && data.totals.caHT === 0 ? (
          <EmptyState
            icon={<Tags size={24} color={t.textMuted} />}
            title="Aucune vente"
            text={`Aucune vente de ${brand} sur cette période${filters.origin ? ` pour ${originLabel(filters.origin)}` : ''}.`}
          />
        ) : (
          <>
            {tab === 'synthesis' ? (
              <SynthesisTab
                detail={data}
                average={average}
                view={filters.view}
                onSelectOrigin={(origin) => patchBrandMarginFilters({ origin })}
              />
            ) : null}
            {tab === 'products' ? (
              <ProductsTab products={data.products} view={filters.view} />
            ) : null}
            {tab === 'orders' ? <OrdersTab detail={data} view={filters.view} /> : null}
            {tab === 'sav' ? <SavTab detail={data} view={filters.view} /> : null}
            <BrandMarginFootnote coverage={data.coverage} />
          </>
        )}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1 },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  problem: { fontSize: fontSize.sm, color: t.danger },
  period: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  coverage: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  headerButton: {
    width: hitTarget - 4,
    height: hitTarget - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
