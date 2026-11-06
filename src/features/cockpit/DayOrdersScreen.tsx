import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ReceiptText } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCockpit } from '@/auth/permissions';
import { Chip } from '@/components/ui';
import { originLabel } from '@/features/orders/orderDisplay';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { HubDayOrderRow } from '@/types/hubDashboard';

import { DayOrderRow } from './components/DayOrderRow';
import { MarginToggle, StatGrid, StatTile } from './components/CockpitPrimitives';
import { formatDayLong, isDateKey } from './dates';
import { useDayOrders } from './hooks/useCockpitData';

/**
 * Commandes réalisées d'un jour du cockpit (`hub-app/dashboard/orders`), avec filtre par
 * origine. Les totaux suivent le filtre ; un appui sur une commande ouvre sa fiche.
 */
export function DayOrdersScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const { date } = useLocalSearchParams<{ date: string }>();
  if (!user) return null;
  if (!canAccessHubCockpit(user.role)) {
    return <AccessDenied text="Le cockpit est réservé aux comptes Super Admin." />;
  }
  if (!isDateKey(date)) {
    return (
      <EmptyState
        icon={<ReceiptText size={24} color={t.textMuted} />}
        title="Date invalide"
        text="Ce jour est introuvable."
      />
    );
  }
  return <DayOrdersContent date={date} />;
}

function DayOrdersContent({ date }: { date: string }) {
  const styles = useStyles();
  const t = useTheme();
  const { data, loading, error, refetch } = useDayOrders(date);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const [origin, setOrigin] = useState<string | null>(null);
  const [showMargin, setShowMargin] = useState(false);

  // Plus récentes d'abord ; le nombre de commandes par origine alimente les puces du filtre.
  const orders = useMemo(
    () => [...(data?.orders ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data],
  );
  const origins = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) counts.set(order.origin, (counts.get(order.origin) ?? 0) + 1);
    return [...counts.entries()].sort(([, a], [, b]) => b - a);
  }, [orders]);

  // Une origine qui n'existe plus après un rafraîchissement ne doit pas vider la liste.
  const activeOrigin = origin && origins.some(([key]) => key === origin) ? origin : null;
  const visible = useMemo(
    () => (activeOrigin ? orders.filter((order) => order.origin === activeOrigin) : orders),
    [orders, activeOrigin],
  );
  const totals = useMemo(
    () =>
      visible.reduce(
        (sum, order) => ({
          caHT: sum.caHT + order.caHT,
          marginHT: sum.marginHT + order.marginHT,
          units: sum.units + order.units,
        }),
        { caHT: 0, marginHT: 0, units: 0 },
      ),
    [visible],
  );
  const marginPct = totals.caHT > 0 ? (totals.marginHT / totals.caHT) * 100 : null;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {formatDayLong(date)}
        </Text>
        <MarginToggle visible={showMargin} onToggle={() => setShowMargin((value) => !value)} />
      </View>

      {data ? (
        <>
          <StatGrid>
            <StatTile label="CA HT" value={formatEuroWhole(totals.caHT)} />
            <StatTile label="Commandes" value={formatInteger(visible.length)} />
            <StatTile label="Unités" value={formatInteger(totals.units)} />
            {showMargin ? (
              <StatTile
                label="Marge brute HT"
                value={formatEuroWhole(totals.marginHT)}
                hint={marginPct !== null ? `${formatPercent(marginPct)} du CA` : undefined}
                tone={totals.marginHT < 0 ? 'danger' : 'default'}
              />
            ) : null}
          </StatGrid>

          {origins.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              accessibilityRole="tablist"
            >
              <Chip
                label="Toutes"
                count={orders.length}
                active={!activeOrigin}
                onPress={() => setOrigin(null)}
              />
              {origins.map(([key, count]) => (
                <Chip
                  key={key}
                  label={originLabel(key)}
                  count={count}
                  active={activeOrigin === key}
                  onPress={() => setOrigin(key)}
                />
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      {error ? (
        <ErrorBanner
          error={error}
          fallback="Impossible de charger les commandes"
          onRetry={() => void onRefresh()}
        />
      ) : null}
      {loading ? <ListSkeleton rows={4} height={72} /> : null}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Commandes du jour' }} />
      <FlatList<HubDayOrderRow>
        data={visible}
        keyExtractor={(order) => order.reference}
        renderItem={({ item }) => <DayOrderRow order={item} showMargin={showMargin} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          data ? (
            <EmptyState
              icon={<ReceiptText size={24} color={t.textMuted} />}
              title="Aucune commande"
              text={
                activeOrigin
                  ? `Aucune commande ${originLabel(activeOrigin)} ce jour-là.`
                  : 'Aucune commande réalisée ce jour-là.'
              }
            />
          ) : undefined
        }
        style={styles.list}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
      />
    </>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const useStyles = makeStyles((t) => ({
  list: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, paddingBottom: spacing['4xl'] },
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: t.text,
  },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
}));
