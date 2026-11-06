import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPreparation } from '@/auth/permissions';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { AgencyList } from '@/features/preparation/components/AgencyList';
import { OrdersList } from '@/features/preparation/components/OrdersList';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { SegmentedControl, type Segment } from '@/features/preparation/components/SegmentedControl';
import { StockFilterBar } from '@/features/preparation/components/StockFilterBar';
import { useDriversTour } from '@/features/preparation/hooks/useDriversTour';
import { usePreparationOrders } from '@/features/preparation/hooks/usePreparationOrders';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatTime } from '@/features/preparation/orderHelpers';
import { colors, fontSize, onDark, spacing } from '@/theme';
import type { StockFilter } from '@/types/preparation';

type PreparationSegment = 'orders' | 'agency';

/**
 * Préparation du HUB, en consultation : commandes à préparer et articles à récupérer
 * en agence proche. Pendant mobile de `/hub/preparation-batipower` du front web.
 */
export default function PreparationScreen() {
  const { user } = useAuth();
  if (!user) return null;
  // Le contenu est un composant à part : les requêtes ne partent pas pour un compte sans accès.
  return canAccessHubPreparation(user.role) ? <PreparationContent /> : <AccessDenied />;
}

function PreparationContent() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<PreparationSegment>('orders');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [search, setSearch] = useState('');

  const orders = usePreparationOrders(stockFilter, search);
  const tour = useDriversTour();
  const ordersRefresh = usePullToRefresh(orders.refetch);
  const tourRefresh = usePullToRefresh(tour.refetch);

  const segments: Segment<PreparationSegment>[] = [
    { key: 'orders', label: 'À préparer', count: orders.counts.all },
    { key: 'agency', label: 'En agence', count: tour.loaded ? tour.totalOrders : undefined },
  ];

  const lastRefresh = segment === 'orders' ? orders.lastRefresh : tour.lastRefresh;
  const isFiltered = stockFilter !== 'all' || search.trim() !== '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Préparation
        </Text>
        {lastRefresh ? (
          <Text style={styles.updated}>Mis à jour à {formatTime(lastRefresh)}</Text>
        ) : null}
      </View>

      <View style={styles.block}>
        <SegmentedControl segments={segments} value={segment} onChange={setSegment} />
      </View>

      {segment === 'orders' ? (
        <>
          <View style={styles.block}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Référence, client, ville"
            />
          </View>
          <View style={styles.filters}>
            <StockFilterBar value={stockFilter} counts={orders.counts} onChange={setStockFilter} />
          </View>
          <OrdersList
            orders={orders.filteredOrders}
            loading={orders.loading}
            error={orders.error}
            filtered={isFiltered}
            refreshing={ordersRefresh.refreshing}
            onRefresh={() => void ordersRefresh.onRefresh()}
          />
        </>
      ) : (
        <AgencyList
          agencies={tour.agencies}
          totalOrders={tour.totalOrders}
          totalReferences={tour.totalReferences}
          totalPieces={tour.totalPieces}
          loading={tour.loading}
          error={tour.error}
          refreshing={tourRefresh.refreshing}
          onRefresh={() => void tourRefresh.onRefresh()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  title: { fontSize: fontSize['3xl'], fontWeight: '700', color: colors.white },
  updated: { fontSize: fontSize.xs, color: onDark.textSubtle },
  block: { paddingHorizontal: spacing.xl },
  filters: { minHeight: 36 },
});
