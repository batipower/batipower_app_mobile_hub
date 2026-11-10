import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { PackageCheck } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCollecte } from '@/auth/permissions';
import { FilterPill } from '@/components/sheet/FilterPill';
import { StatGrid, StatTile } from '@/features/cockpit/components/CockpitPrimitives';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { Segment, SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { CollecteMinHours, CollecteWarehouse, UncollectedColis } from '@/types/hubCollecte';

import { CollecteCard } from './components/CollecteCard';
import {
  COLLECTE_WAREHOUSES,
  DEFAULT_COLLECTE_WAREHOUSE,
  DEFAULT_MIN_HOURS,
  MIN_HOURS_OPTIONS,
} from './display';
import { useCollecteActions } from './hooks/useCollecteActions';
import { useCollecteUncollected } from './hooks/useCollecteUncollected';
import { openCollecteHistory, openCollecteOrder } from './navigation';

const keyExtractor = (row: UncollectedColis) => `${row.orderReference}-${row.coliNumber}`;

/** Collecte entrepôt du HUB, réservée aux SUPERADMIN et MANAGER. */
export function CollecteScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubCollecte(user.role) ? (
    <Collecte />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="La collecte entrepôt est réservée aux comptes Manager et Super Admin."
    />
  );
}

function Collecte() {
  const styles = useStyles();
  const t = useTheme();
  const [warehouse, setWarehouse] = useState<CollecteWarehouse>(DEFAULT_COLLECTE_WAREHOUSE);
  const [minHours, setMinHours] = useState<CollecteMinHours>(DEFAULT_MIN_HOURS);

  const query = useCollecteUncollected(warehouse, minHours);
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const actions = useCollecteActions();
  const { request, pendingFor } = actions;

  const rows = query.data?.rows ?? [];
  const stats = query.data?.stats ?? { total: 0, over24h: 0, over48h: 0, over72h: 0, viaHistory: 0 };
  const loading = query.isPending;

  const ageSegments = useMemo<Segment<`${CollecteMinHours}`>[]>(() => {
    const counts: Record<CollecteMinHours, number> = {
      0: stats.total,
      24: stats.over24h,
      48: stats.over48h,
      72: stats.over72h,
    };
    return MIN_HOURS_OPTIONS.map((option) => ({
      key: `${option.value}` as `${CollecteMinHours}`,
      label: option.label,
      count: counts[option.value],
    }));
  }, [stats.total, stats.over24h, stats.over48h, stats.over72h]);

  const handleOpenOrder = useCallback((row: UncollectedColis) => openCollecteOrder(row.orderReference), []);
  const handleHistory = useCallback((row: UncollectedColis) => openCollecteHistory(row.orderReference), []);
  const handleCollect = useCallback(
    (row: UncollectedColis) =>
      request({ kind: 'collect', reference: row.orderReference, totalColis: row.totalColis }),
    [request],
  );
  const handleDeliver = useCallback(
    (row: UncollectedColis) =>
      request({ kind: 'deliver', reference: row.orderReference, totalColis: row.totalColis }),
    [request],
  );

  const updatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;

  return (
    <FlatList
      data={rows}
      keyExtractor={keyExtractor}
      extraData={[actions.isPending]}
      renderItem={({ item }) => (
        <View style={styles.cardWrap}>
          <CollecteCard
            row={item}
            pending={pendingFor(item.orderReference)}
            onOpenOrder={handleOpenOrder}
            onHistory={handleHistory}
            onCollect={handleCollect}
            onDeliver={handleDeliver}
          />
        </View>
      )}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      initialNumToRender={5}
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
          <View style={styles.chips}>
            {COLLECTE_WAREHOUSES.map((option) => (
              <FilterPill
                key={option.key}
                label={option.label}
                state={warehouse === option.key ? 'on' : 'off'}
                onPress={() => setWarehouse(option.key)}
              />
            ))}
          </View>

          <View style={styles.padded}>
            <SegmentedControl
              segments={ageSegments}
              value={`${minHours}` as `${CollecteMinHours}`}
              onChange={(key) => setMinHours(Number(key) as CollecteMinHours)}
            />
            <StatGrid>
              <StatTile label="Non collectés" value={formatInteger(stats.total)} />
              <StatTile
                label="Via ancienne étiquette"
                value={formatInteger(stats.viaHistory)}
                hint="Une autre étiquette de la commande a été collectée"
                tone={stats.viaHistory > 0 ? 'warning' : 'default'}
              />
            </StatGrid>
            <View style={styles.summary}>
              <Text style={styles.hint}>
                Colis dont la commande est encore « Expédié » et dont l&apos;étiquette actuelle n&apos;a
                pas été scannée en collecte.
                {updatedAt && !Number.isNaN(updatedAt.getTime())
                  ? ` Mis à jour à ${updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
                  : ''}
              </Text>
              {query.isFetching && !loading && !refreshing ? (
                <ActivityIndicator size="small" color={t.accentText} />
              ) : null}
            </View>
          </View>

          {query.error && rows.length > 0 ? (
            <View style={styles.padded}>
              <ErrorBanner
                error={query.error}
                fallback="Impossible de charger les colis non collectés"
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.cardWrap}>
            <ListSkeleton rows={3} height={260} />
          </View>
        ) : query.error ? (
          <View style={styles.cardWrap}>
            <ErrorBanner
              error={query.error}
              fallback="Impossible de charger les colis non collectés"
              onRetry={() => void onRefresh()}
            />
          </View>
        ) : (
          <EmptyState
            icon={<PackageCheck size={24} color={t.textMuted} />}
            title="Aucun colis non collecté"
            text="Tous les colis expédiés de cet entrepôt ont été collectés pour ce seuil."
          />
        )
      }
    />
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: spacing['4xl'] },
  header: { gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  padded: { gap: spacing.md, paddingHorizontal: spacing.xl },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xl },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hint: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
