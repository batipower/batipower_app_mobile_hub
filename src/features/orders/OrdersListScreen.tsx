import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PackageSearch } from 'lucide-react-native';

import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { useOpenResults } from '@/features/search/hooks/useOpenResults';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, spacing, useTheme } from '@/theme';
import type { OrderSearchHit } from '@/types/order';

import { OrderResultCard } from './components/OrderResultCard';
import { useOrdersList, type OrdersListMode } from './hooks/useOrdersList';

const keyExtractor = (order: OrderSearchHit) => order.uuid;

/**
 * Liste complète des commandes d'une recherche : `?q=` pour la recherche libre
 * (référence, client, téléphone, suivi…), `?produit=` pour les commandes qui contiennent
 * une référence produit. Défilement infini.
 */
export function OrdersListScreen() {
  const styles = useStyles();
  const t = useTheme();
  const params = useLocalSearchParams<{ q?: string; produit?: string }>();
  const mode: OrdersListMode = params.produit ? 'product' : 'search';
  const term = (params.produit ?? params.q ?? '').trim();

  const list = useOrdersList(mode, term);
  const { openOrderHit } = useOpenResults();
  const { refreshing, onRefresh } = usePullToRefresh(list.refetch);

  const plural = (list.total ?? 0) > 1 ? 's' : '';
  const summary =
    list.total === null
      ? null
      : mode === 'product' && list.totalQuantity !== null
        ? `${formatInteger(list.total)} commande${plural} · ${formatInteger(list.totalQuantity)} pièces vendues`
        : `${formatInteger(list.total)} commande${plural}`;

  return (
    <>
      <Stack.Screen
        options={{ title: mode === 'product' ? 'Commandes du produit' : 'Commandes' }}
      />
      <FlatList
        data={list.orders}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <OrderResultCard order={item} onPress={openOrderHit} />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
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
            <Text style={[styles.term, mode === 'product' && styles.termMono]} numberOfLines={2}>
              {mode === 'product' ? `Contenant ${term}` : `« ${term} »`}
            </Text>
            {summary ? <Text style={styles.summary}>{summary}</Text> : null}
            {list.error && list.orders.length > 0 ? (
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger les commandes"
                onRetry={() => void onRefresh()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <ListSkeleton rows={5} height={108} />
          ) : list.error ? (
            <ErrorBanner
              error={list.error}
              fallback="Impossible de charger les commandes"
              onRetry={() => void onRefresh()}
            />
          ) : (
            <EmptyState
              icon={<PackageSearch size={24} color={t.textMuted} />}
              title="Aucune commande"
              text="Aucune commande ne correspond à cette recherche."
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

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
  header: { gap: spacing.xs, paddingVertical: spacing.lg },
  term: { fontSize: fontSize.xl, fontWeight: '700', color: t.text },
  termMono: { fontFamily: monoFontFamily },
  summary: { fontSize: fontSize.sm, color: t.textMuted },
  separator: { height: spacing.md },
  footer: { paddingVertical: spacing.xl },
}));
