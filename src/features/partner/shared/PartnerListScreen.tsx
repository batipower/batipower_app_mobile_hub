import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { useTabBarInset } from '@/components/navigation/tabBarInset';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import {
  SegmentedControl,
  type Segment,
} from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { FilterHeaderButton } from './FilterHeaderButton';

/** Ce que les écrans attendent d'une liste paginée (voir les hooks `use*List` de chaque onglet). */
export interface PartnerListState<TItem> {
  items: TItem[];
  loading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
}

type PartnerListScreenProps<TItem, TSegment extends string> = {
  title: string;
  list: PartnerListState<TItem>;
  /** Libellé du total sous les filtres (« 12 produits »), `null` tant qu'il est inconnu. */
  totalLabel: string | null;
  renderItem: (item: TItem) => ReactElement;
  keyExtractor: (item: TItem) => string;
  /** Segments (périmètre Standard / DEP, statut…) ; absents, aucun contrôle n'est affiché. */
  segments?: readonly Segment<TSegment>[];
  segment?: TSegment;
  onSegmentChange?: (segment: TSegment) => void;
  /** Recherche : champ masqué quand `onSearchChange` n'est pas fourni. */
  search?: string;
  onSearchChange?: (text: string) => void;
  /** Terme de recherche posé (pour le message de liste vide). */
  term?: string;
  searchPlaceholder?: string;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
  /** Barre fixe sous la recherche (puces de statut défilantes), hors de la liste. */
  toolbar?: ReactNode;
  /** Puces des filtres actifs, sous le bandeau d'en-tête. */
  filterPills?: ReactNode;
  /** Bandeau placé sous le titre (information de périmètre, accès restreint…). */
  notice?: ReactNode;
  errorFallback: string;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyText: string;
  /** Texte de la liste vide quand un filtre ou une recherche est actif. */
  emptyFilteredText?: string;
  skeletonHeight?: number;
  /** Force le rendu des lignes quand un état extérieur à `items` les modifie. */
  extraData?: unknown;
};

/**
 * Squelette commun des quatre listes PARTNER : titre, pastille de module, filtres, segments,
 * recherche, résumé, défilement infini et états chargement / vide / erreur. Sans en-tête natif,
 * comme les autres onglets du HUB : tout est posé dès le haut de la zone sûre.
 */
export function PartnerListScreen<TItem, TSegment extends string = string>({
  title,
  list,
  totalLabel,
  renderItem,
  keyExtractor,
  segments,
  segment,
  onSegmentChange,
  search = '',
  onSearchChange,
  term = '',
  searchPlaceholder,
  activeFilterCount = 0,
  onOpenFilters,
  toolbar,
  filterPills,
  notice,
  errorFallback,
  emptyIcon,
  emptyTitle,
  emptyText,
  emptyFilteredText = 'Aucun résultat ne correspond à ces filtres.',
  skeletonHeight = 120,
  extraData,
}: PartnerListScreenProps<TItem, TSegment>) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { refreshing, onRefresh } = usePullToRefresh(list.refetch);
  const filtered = activeFilterCount > 0 || term !== '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          {onOpenFilters ? (
            <FilterHeaderButton count={activeFilterCount} onPress={onOpenFilters} />
          ) : null}
          <ModuleSwitcherButton active="PARTNER" />
        </View>
      </View>

      {segments && segment !== undefined && onSegmentChange ? (
        <View style={styles.block}>
          <SegmentedControl segments={segments} value={segment} onChange={onSegmentChange} />
        </View>
      ) : null}
      {onSearchChange ? (
        <View style={styles.block}>
          <SearchBar value={search} onChangeText={onSearchChange} placeholder={searchPlaceholder} />
        </View>
      ) : null}

      {toolbar}

      <FlatList
        data={list.items}
        extraData={extraData}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <View style={styles.cardWrap}>{renderItem(item)}</View>}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + spacing['2xl'] }]}
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
          <View style={styles.listHeader}>
            {notice}
            {filterPills}
            <View style={styles.summary}>
              <Text style={styles.total}>{totalLabel ?? 'Chargement…'}</Text>
              {list.isRefetching ? <ActivityIndicator size="small" color={t.accentText} /> : null}
            </View>
            {list.error && list.items.length > 0 ? (
              <ErrorBanner
                error={list.error}
                fallback={errorFallback}
                onRetry={() => void onRefresh()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <View style={styles.cardWrap}>
              <ListSkeleton rows={4} height={skeletonHeight} />
            </View>
          ) : list.error ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={list.error}
                fallback={errorFallback}
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : (
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              text={filtered ? emptyFilteredText : emptyText}
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
    </View>
  );
}

/** Rangée des puces de filtres actifs, à passer à `filterPills`. */
export function FilterPillRow({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.pills}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.bg, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: { flex: 1, fontSize: fontSize['3xl'], fontWeight: '700', color: t.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  block: { paddingHorizontal: spacing.xl },
  content: { flexGrow: 1 },
  listHeader: { gap: spacing.md, paddingBottom: spacing.md },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  total: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: t.text },
  footer: { paddingVertical: spacing.xl },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xl },
}));
