import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ArrowDownUp, ReceiptText } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCockpit } from '@/auth/permissions';
import { Chip } from '@/components/ui';
import { OriginLogo } from '@/features/orders/components/OriginLogo';
import { originLabel } from '@/features/orders/orderDisplay';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { HubDayOrderRow } from '@/types/hubDashboard';

import { DayOrderRow } from './components/DayOrderRow';
import { MarginToggle, StatGrid, StatTile } from './components/CockpitPrimitives';
import { formatDayLong, isDateKey } from './dates';
import { useDayOrders } from './hooks/useCockpitData';
import { MARKETPLACES_FILTER } from './navigation';

const WEBSITE = 'WEBSITE';

type SortKey = 'time' | 'margin';

/** Une commande appartient au filtre : une origine précise ou l'ensemble des marketplaces. */
function matchesOrigin(order: HubDayOrderRow, filter: string): boolean {
  return filter === MARKETPLACES_FILTER ? order.origin !== WEBSITE : order.origin === filter;
}

function filterLabel(filter: string): string {
  return filter === MARKETPLACES_FILTER ? 'Marketplaces' : originLabel(filter);
}

/**
 * Commandes réalisées d'un jour du cockpit (`hub-app/dashboard/orders`), avec filtre par
 * origine (présélectionnable via `?origin=`), recherche référence / code promo et tri heure ou
 * marge. Les totaux suivent filtre et recherche ; un appui sur une commande ouvre sa fiche.
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
  const params = useLocalSearchParams<{ origin?: string; margin?: string }>();
  const { data, loading, error, refetch } = useDayOrders(date);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  // Origine et marge peuvent être présélectionnées par le cockpit (canal touché, bascule « Marge »).
  const [origin, setOrigin] = useState<string | null>(params.origin ?? null);
  const [showMargin, setShowMargin] = useState(params.margin === '1');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('time');

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
  const marketplaceCount = useMemo(
    () => orders.filter((order) => order.origin !== WEBSITE).length,
    [orders],
  );

  // Une origine qui n'existe plus après un rafraîchissement ne doit pas vider la liste.
  const activeOrigin =
    origin === MARKETPLACES_FILTER
      ? marketplaceCount > 0
        ? origin
        : null
      : origin && origins.some(([key]) => key === origin)
        ? origin
        : null;
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = orders.filter(
      (order) =>
        (!activeOrigin || matchesOrigin(order, activeOrigin)) &&
        (needle === '' ||
          order.reference.toLowerCase().includes(needle) ||
          (order.promo?.code ?? '').toLowerCase().includes(needle)),
    );
    return sort === 'margin' ? [...filtered].sort((a, b) => b.marginHT - a.marginHT) : filtered;
  }, [orders, activeOrigin, search, sort]);
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

          <View style={styles.tools}>
            <View style={styles.search}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Référence ou code promo"
              />
            </View>
            <Pressable
              onPress={() => setSort((value) => (value === 'margin' ? 'time' : 'margin'))}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === 'margin' }}
              accessibilityLabel={
                sort === 'margin' ? 'Tri par marge décroissante' : 'Tri par heure décroissante'
              }
              style={[styles.sort, sort === 'margin' && styles.sortActive]}
            >
              <ArrowDownUp size={14} color={sort === 'margin' ? t.accentText : t.textSubtle} />
              <Text style={[styles.sortText, sort === 'margin' && { color: t.accentText }]}>
                {sort === 'margin' ? 'Marge' : 'Heure'}
              </Text>
            </Pressable>
          </View>

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
              {origins.some(([key]) => key === WEBSITE) && marketplaceCount > 0 ? (
                <Chip
                  label="Marketplaces"
                  count={marketplaceCount}
                  active={activeOrigin === MARKETPLACES_FILTER}
                  onPress={() => setOrigin(MARKETPLACES_FILTER)}
                />
              ) : null}
              {origins.map(([key, count]) => (
                <Chip
                  key={key}
                  label={originLabel(key)}
                  icon={<OriginLogo origin={key} size={18} />}
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
                search.trim()
                  ? 'Aucune commande ne correspond à la recherche.'
                  : activeOrigin
                    ? `Aucune commande ${filterLabel(activeOrigin)} ce jour-là.`
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
  tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: { flex: 1 },
  sort: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  sortActive: { borderColor: withAlpha(t.accent, 0.5), backgroundColor: withAlpha(t.accent, 0.16) },
  sortText: { fontSize: fontSize.xs, fontWeight: '700', color: t.textSubtle },
}));
