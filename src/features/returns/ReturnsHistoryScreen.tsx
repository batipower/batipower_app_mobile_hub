import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { PackageSearch, SlidersHorizontal, X } from 'lucide-react-native';

import type { HubReturnHistoryItem } from '@/api/hubReturns';
import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubReturns } from '@/auth/permissions';
import { FilterPill } from '@/components/sheet/FilterPill';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { formatInteger } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';

import { ReturnCard } from './components/ReturnCard';
import {
  returnHistoryTarget,
  returnSourceLabel,
  returnTypeFilterLabel,
} from './constants';
import {
  countActiveReturnsFilters,
  patchReturnsFilters,
  useReturnsFilters,
} from './filtersStore';
import { useReturnHistory } from './hooks/useReturnHistory';
import { openReturn, openReturnFilters } from './navigation';

const keyExtractor = (item: HubReturnHistoryItem) => `${item.source}-${item.id}`;

/** Historique des retours du HUB, réservé aux SUPERADMIN et MANAGER (comme le back). */
export function ReturnsHistoryScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubReturns(user.role) ? (
    <ReturnsHistory />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="Les retours de commande sont réservés aux comptes Manager et Super Admin."
    />
  );
}

function ReturnsHistory() {
  const styles = useStyles();
  const t = useTheme();
  const filters = useReturnsFilters();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  const list = useReturnHistory(filters, term, true);
  const { refreshing, onRefresh } = usePullToRefresh(list.refetch);
  const activeCount = countActiveReturnsFilters(filters);

  const open = useCallback((item: HubReturnHistoryItem) => {
    const target = returnHistoryTarget(item);
    if (target) openReturn(target);
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filtres${activeCount > 0 ? `, ${activeCount} actif${activeCount > 1 ? 's' : ''}` : ''}`}
              hitSlop={6}
              onPress={openReturnFilters}
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
        placeholder="Réf. commande, n° de suivi, client"
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
      />
      <FlatList
        data={list.items}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ReturnCard item={item} onPress={open} />
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
            {activeCount > 0 ? (
              <View style={styles.chips}>
                {filters.source !== 'ALL' ? (
                  <FilterPill
                    label={returnSourceLabel(filters.source)}
                    state="on"
                    onPress={() => patchReturnsFilters({ source: 'ALL' })}
                    trailing={<X size={12} color={t.accentText} />}
                  />
                ) : null}
                {filters.type !== 'ANY' ? (
                  <FilterPill
                    label={returnTypeFilterLabel(filters.type)}
                    state="on"
                    onPress={() => patchReturnsFilters({ type: 'ANY' })}
                    trailing={<X size={12} color={t.accentText} />}
                  />
                ) : null}
              </View>
            ) : null}
            <View style={styles.summary}>
              <Text style={styles.total}>
                {list.total === null
                  ? 'Chargement…'
                  : `${formatInteger(list.total)} retour${list.total > 1 ? 's' : ''}`}
                {term ? ` · « ${term} »` : ''}
              </Text>
              {list.isRefetching ? <ActivityIndicator size="small" color={t.accentText} /> : null}
            </View>
            {list.error && list.items.length > 0 ? (
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger les retours"
                onRetry={() => void onRefresh()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <View style={styles.cardWrap}>
              <ListSkeleton rows={4} height={140} />
            </View>
          ) : list.error ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger les retours"
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : (
            <EmptyState
              icon={<PackageSearch size={24} color={t.textMuted} />}
              title="Aucun retour"
              text={
                activeCount > 0 || term
                  ? 'Aucun retour ne correspond à ces filtres.'
                  : "Aucun retour n'a encore été enregistré."
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

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: spacing['4xl'] },
  header: { gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xl },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  total: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: t.text },
  footer: { paddingVertical: spacing.xl },
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
