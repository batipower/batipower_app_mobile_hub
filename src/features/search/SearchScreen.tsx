import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SearchX } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubProductAnalyzer, canAccessHubProductSheet } from '@/auth/permissions';
import { OrderResultCard } from '@/features/orders/components/OrderResultCard';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SegmentedControl, type Segment } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { ProductResultCard } from '@/features/products/components/ProductResultCard';
import { useTabBarInset } from '@/components/navigation/tabBarInset';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { HubSearchHistoryEntry } from '@/types/searchHistory';
import type { OrderSearchHit } from '@/types/order';
import type { HubProductSearchHit } from '@/types/product';

import { RecentSearchRow } from './components/RecentSearchRow';
import { SearchHints } from './components/SearchHints';
import { SectionHeader } from './components/SectionHeader';
import { SeeAllLink } from './components/SeeAllLink';
import { useOpenResults } from './hooks/useOpenResults';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useUnifiedSearch } from './hooks/useUnifiedSearch';
import { openOrdersList } from './navigation';
import { MIN_SEARCH_LENGTH, PREVIEW_LIMIT, resolveProductTarget } from './searchHelpers';

type SearchFilter = 'all' | 'orders' | 'products';

type Row =
  | { kind: 'recent'; entry: HubSearchHistoryEntry }
  | { kind: 'order'; hit: OrderSearchHit }
  | { kind: 'product'; hit: HubProductSearchHit };

type SearchSection = {
  key: 'recent' | 'orders' | 'products';
  title: string;
  /** Compteur exact uniquement (omis quand des résultats dépassent l'aperçu). */
  count?: number;
  data: Row[];
};

const PLACEHOLDER_WITH_PRODUCTS = 'Commande, client, produit, EAN…';
const PLACEHOLDER_ORDERS_ONLY = 'Commande, client, téléphone, suivi…';

/**
 * Recherche du HUB : une saisie, dans la barre de recherche native du header, interroge
 * les commandes (tout compte HUB) et les fiches produit (SUPERADMIN, MANAGER). Champ vide :
 * les recherches récentes, partagées avec le web.
 */
export function SearchScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <SearchContent
      canSearchProducts={canAccessHubProductSheet(user.role)}
      canOpenAnalyzer={canAccessHubProductAnalyzer(user.role)}
    />
  );
}

function SearchContent({
  canSearchProducts,
  canOpenAnalyzer,
}: {
  canSearchProducts: boolean;
  canOpenAnalyzer: boolean;
}) {
  const styles = useStyles();
  const tabBarInset = useTabBarInset();
  const t = useTheme();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');

  const search = useUnifiedSearch(text, canSearchProducts);
  const history = useSearchHistory();
  const { openOrderHit, openProductHit, openRecent, clearHistory } = useOpenResults();

  const typed = text.trim().length >= MIN_SEARCH_LENGTH;
  const showOrders = filter !== 'products';
  const showProducts = canSearchProducts && filter !== 'orders';

  const refresh = usePullToRefresh(
    useCallback(() => (typed ? search.refetch() : history.refetch()), [typed, search, history]),
  );

  // Les fiches produit et celles de l'analyseur sont réservées à certains rôles : on ne propose
  // que ce que l'utilisateur peut ouvrir.
  const recents = useMemo(
    () =>
      history.entries.filter(
        (entry) =>
          (entry.type !== 'ANALYZER' || canOpenAnalyzer) && (entry.type !== 'PRODUCT' || canSearchProducts),
      ),
    [history.entries, canSearchProducts, canOpenAnalyzer],
  );

  const ordersCountExact =
    search.savCount <= PREVIEW_LIMIT && search.productOrdersCount <= PREVIEW_LIMIT;

  const sections = useMemo<SearchSection[]>(() => {
    if (!typed) {
      return recents.length > 0
        ? [
            {
              key: 'recent',
              title: 'Recherches récentes',
              data: recents.map((entry) => ({ kind: 'recent', entry })),
            },
          ]
        : [];
    }
    const result: SearchSection[] = [];
    if (showOrders && search.orders.length > 0) {
      result.push({
        key: 'orders',
        title: 'Commandes',
        count: ordersCountExact ? search.orders.length : undefined,
        data: search.orders.map((hit) => ({ kind: 'order', hit })),
      });
    }
    if (showProducts && search.products.length > 0) {
      result.push({
        key: 'products',
        title: 'Produits',
        count: search.products.length,
        data: search.products.map((hit) => ({ kind: 'product', hit })),
      });
    }
    return result;
  }, [typed, recents, showOrders, showProducts, search.orders, search.products, ordersCountExact]);

  const confirmClear = useCallback(() => {
    Alert.alert(
      "Effacer l'historique",
      'Les recherches récentes seront aussi effacées sur le site web.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Effacer', style: 'destructive', onPress: clearHistory },
      ],
    );
  }, [clearHistory]);

  /**
   * Touche « Rechercher » du clavier : ouvre directement le résultat quand il n'y a aucune
   * ambiguïté (référence exacte, résultat unique), comme la barre de recherche du web.
   */
  const openBestMatch = useCallback(() => {
    if (!search.settled || search.pending || search.term !== text.trim()) return;

    const exactOrder = search.orders.find(
      (order) => order.reference.toLowerCase() === search.term.toLowerCase(),
    );
    if (exactOrder) {
      openOrderHit(exactOrder);
      return;
    }

    const productTarget = resolveProductTarget(search.products);
    const product = search.products.find((hit) => hit.reference === productTarget);
    if (product && search.orders.length === 0) {
      openProductHit(product);
      return;
    }

    const [onlyOrder] = search.orders;
    if (onlyOrder && search.orders.length === 1 && search.products.length === 0) {
      openOrderHit(onlyOrder);
    }
  }, [search, text, openOrderHit, openProductHit]);

  // ── Rendu ──────────────────────────────────────────────────────────────────

  const segments: Segment<SearchFilter>[] = [
    { key: 'all', label: 'Tout' },
    { key: 'orders', label: 'Commandes' },
    { key: 'products', label: 'Produits' },
  ];

  const partialError =
    typed &&
    ((showOrders && search.ordersError && search.products.length > 0) ||
      (showProducts && search.productsError && search.orders.length > 0));

  const header = typed ? (
    <View style={styles.listHeader}>
      {canSearchProducts ? (
        <SegmentedControl segments={segments} value={filter} onChange={setFilter} />
      ) : null}
      {partialError ? (
        <ErrorBanner
          error={null}
          fallback={
            search.ordersError
              ? 'Les commandes n’ont pas pu être chargées.'
              : 'Les produits n’ont pas pu être chargés.'
          }
          onRetry={() => void search.refetch()}
        />
      ) : null}
    </View>
  ) : null;

  let empty: ReactElement | null;
  if (!typed) {
    empty = <SearchHints withProducts={canSearchProducts} />;
  } else {
    const loading =
      !search.active ||
      (showOrders && search.ordersLoading) ||
      (showProducts && search.productsLoading);
    const failed = (showOrders && search.ordersError) || (showProducts && search.productsError);
    if (loading) empty = <ListSkeleton rows={4} height={108} />;
    else if (failed) {
      empty = (
        <ErrorBanner
          error={null}
          fallback="La recherche a échoué. Vérifiez votre connexion."
          onRetry={() => void search.refetch()}
        />
      );
    } else {
      empty = (
        <EmptyState
          icon={<SearchX size={24} color={t.textMuted} />}
          title="Aucun résultat"
          text={`Rien ne correspond à « ${search.term} ». Vérifiez l’orthographe ou essayez une autre référence.`}
        />
      );
    }
  }

  return (
    <>
      <Stack.SearchBar
        placeholder={canSearchProducts ? PLACEHOLDER_WITH_PRODUCTS : PLACEHOLDER_ORDERS_ONLY}
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
        onSearchButtonPress={openBestMatch}
      />
      <SectionList<Row, SearchSection>
        sections={sections}
        keyExtractor={(row) =>
          row.kind === 'recent' ? `recent-${row.entry.id}` : `${row.kind}-${row.hit.reference}`
        }
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'recent':
              return <RecentSearchRow entry={item.entry} onPress={openRecent} />;
            case 'order':
              return <OrderResultCard order={item.hit} onPress={openOrderHit} />;
            case 'product':
              return <ProductResultCard product={item.hit} onPress={openProductHit} />;
          }
        }}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            title={section.title}
            count={section.count}
            trailing={
              section.key === 'recent' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Effacer l'historique des recherches"
                  hitSlop={12}
                  onPress={confirmClear}
                >
                  <Text style={styles.clear}>Effacer</Text>
                </Pressable>
              ) : undefined
            }
          />
        )}
        renderSectionFooter={({ section }) =>
          section.key === 'orders' ? (
            <View style={styles.footer}>
              {search.savCount > PREVIEW_LIMIT ? (
                <SeeAllLink
                  label={`Voir les ${search.savCount} commandes`}
                  onPress={() => openOrdersList({ q: search.term })}
                />
              ) : null}
              {search.productOrdersCount > PREVIEW_LIMIT ? (
                <SeeAllLink
                  label={`Voir les ${search.productOrdersCount} commandes contenant « ${search.term} »`}
                  onPress={() => openOrdersList({ produit: search.term })}
                />
              ) : null}
            </View>
          ) : null
        }
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header ?? undefined}
        ListEmptyComponent={empty ?? undefined}
        stickySectionHeadersEnabled
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresh.refreshing}
            onRefresh={() => void refresh.onRefresh()}
            tintColor={t.accentText}
          />
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
  listHeader: { gap: spacing.md, paddingTop: spacing.sm },
  separator: { height: spacing.md },
  footer: { paddingBottom: spacing.sm },
  clear: { fontSize: fontSize.sm, fontWeight: '600', color: t.accentText },
}));
