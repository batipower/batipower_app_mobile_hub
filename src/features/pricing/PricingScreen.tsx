import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { ArrowDownUp, BarChart3, PackageSearch, SlidersHorizontal } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPricing } from '@/auth/permissions';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { formatInteger } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { HubPricingRow } from '@/types/hubPricing';

import { ActiveFilterChips } from './components/ActiveFilterChips';
import { PricingRowCard } from './components/PricingRowCard';
import { QuickFilters } from './components/QuickFilters';
import { StockValuationStrip } from './components/StockValuationStrip';
import { countActiveFilters } from './filters';
import { getPricingState, patchPricingFilters, usePricingState } from './filtersStore';
import { usePricingList } from './hooks/usePricingList';
import {
  openPricingFilters,
  openPricingRow,
  openPricingSort,
  openPricingStats,
} from './navigation';
import { sortLabel } from './options';

const keyExtractor = (row: HubPricingRow) => row.uuid;

/** Liste Pricing du HUB, réservée au SUPERADMIN (comme `/hub/pricing` côté web et le back). */
export function PricingScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPricing(user.role) ? (
    <PricingList />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="La page Pricing est réservée aux comptes Super Admin."
    />
  );
}

function PricingList() {
  const styles = useStyles();
  const t = useTheme();
  const { filters, country } = usePricingState();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  // La barre de recherche native démarre vide : on aligne le filtre sur elle (au montage
  // comme à chaque saisie), sinon un ancien terme resterait appliqué sans être visible.
  useEffect(() => {
    if (term !== getPricingState().filters.search) patchPricingFilters({ search: term });
  }, [term]);

  const list = usePricingList(filters, country, true);
  const { refreshing, onRefresh } = usePullToRefresh(list.refetch);
  const activeCount = countActiveFilters(filters);
  const hasFilters = activeCount > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              <HeaderButton
                label="Trier"
                icon={<ArrowDownUp size={20} color={t.accentText} />}
                dot={!!filters.sortBy}
                onPress={openPricingSort}
              />
              <HeaderButton
                label={`Filtres${activeCount > 0 ? `, ${activeCount} actif${activeCount > 1 ? 's' : ''}` : ''}`}
                icon={<SlidersHorizontal size={20} color={t.accentText} />}
                count={activeCount}
                onPress={openPricingFilters}
              />
            </View>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder="Référence, EAN, désignation, marque"
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
      />
      <FlatList
        data={list.rows}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <PricingRowCard
              row={item}
              country={country}
              onPress={(row) => openPricingRow(row.reference)}
            />
          </View>
        )}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        initialNumToRender={6}
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
            <QuickFilters />
            <ActiveFilterChips />
            <StockValuationStrip />
            <View style={styles.summary}>
              <View style={styles.summaryText}>
                <Text style={styles.total}>
                  {list.total === null
                    ? 'Chargement…'
                    : `${formatInteger(list.total)} référence${list.total > 1 ? 's' : ''}`}
                </Text>
                {filters.sortBy ? (
                  <Text style={styles.sort} numberOfLines={1}>
                    Tri : {sortLabel(filters.sortBy)} (
                    {filters.sortOrder === 'asc' ? 'croissant' : 'décroissant'})
                  </Text>
                ) : null}
              </View>
              {list.isRefetching ? <ActivityIndicator size="small" color={t.accentText} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Statistiques de la sélection"
                onPress={openPricingStats}
                style={({ pressed }) => [styles.statsButton, pressed && styles.statsPressed]}
              >
                <BarChart3 size={16} color={t.accentText} />
                <Text style={styles.statsLabel}>Stats</Text>
              </Pressable>
            </View>
            {list.error && list.rows.length > 0 ? (
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger le catalogue"
                onRetry={() => void onRefresh()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <View style={styles.cardWrap}>
              <ListSkeleton rows={4} height={230} />
            </View>
          ) : list.error ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger le catalogue"
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : (
            <EmptyState
              icon={<PackageSearch size={24} color={t.textMuted} />}
              title="Aucune référence"
              text={
                hasFilters || filters.search
                  ? 'Aucun produit ne correspond à ces filtres.'
                  : 'Le catalogue est vide.'
              }
            />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={t.accentText} />
            </View>
          ) : undefined
        }
      />
    </>
  );
}

type HeaderButtonProps = {
  label: string;
  icon: React.ReactNode;
  /** Compteur affiché dans une pastille (filtres actifs). */
  count?: number;
  /** Simple point : un réglage non neutre est appliqué (tri). */
  dot?: boolean;
  onPress: () => void;
};

function HeaderButton({ label, icon, count = 0, dot = false, onPress }: HeaderButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={styles.headerButton}
    >
      {icon}
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : dot ? (
        <View style={styles.dot} />
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: spacing['4xl'] },
  header: { gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
  dot: {
    position: 'absolute',
    top: 8,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: t.accent,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  summaryText: { flex: 1, gap: 2 },
  total: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  sort: { fontSize: fontSize.xs, color: t.textMuted },
  statsButton: {
    minHeight: hitTarget - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: withAlpha(t.accent, 0.14),
  },
  statsPressed: { opacity: 0.7 },
  statsLabel: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
  footer: { paddingVertical: spacing.xl },
}));
