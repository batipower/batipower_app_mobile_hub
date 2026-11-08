import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownUp,
  Handshake,
  History,
  ScanSearch,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react-native';

import { Button } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { formatInteger } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { StagingItem, ViabilityCountry } from '@/types/hubProductAnalyzer';

import { deleteStagingItems } from '../bulkActions';
import { ActiveChips, QuickFilters, ViabilityTabs } from '../components/HistoryFilters';
import { AffaireBanner } from '../components/AffaireBanner';
import { AnalysisBanner } from '../components/AnalysisBanner';
import { SelectionBar } from '../components/SelectionBar';
import { StagingCard } from '../components/StagingCard';
import {
  countPaFilters,
  getPaFilters,
  hasActiveStagingFilters,
  patchPaFilters,
  resetPaFilters,
  usePaFilters,
} from '../filtersStore';
import { negoScopeOf, useNegoInfo } from '../hooks/useNegoInfo';
import { useStagingList, useViabilityCounts } from '../hooks/useStagingList';
import { canDeleteStaging } from '../lib/helpers';
import { openPaFiche, openPaFilters, openPaLauncher, openPaNego, openPaSort } from '../navigation';
import { PA_ROOT } from '../queryKeys';
import { clearSelection, toggleSelect, useSelection } from '../selectionStore';

const keyExtractor = (item: StagingItem) => item.uuid;
const ACTION_WIDTH = 76;

/** Historique des analyses du Product Analyzer : liste infinie, filtres, sélection multiple et actions. */
export function HistoryScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const filters = usePaFilters();
  const selection = useSelection();
  const selecting = selection.size > 0;

  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  // La barre de recherche native démarre vide : on aligne le filtre sur elle, sinon un ancien
  // terme resterait appliqué sans être visible.
  useEffect(() => {
    if (term !== getPaFilters().search) patchPaFilters({ search: term });
  }, [term]);

  // Quitter l'écran (retour menu) ne doit pas laisser une sélection fantôme au retour.
  useEffect(() => () => clearSelection(), []);

  const list = useStagingList(filters);
  const counts = useViabilityCounts(filters);
  const uuids = useMemo(() => list.items.map((i) => i.uuid), [list.items]);
  const scope = useMemo(() => negoScopeOf(filters), [filters]);
  const nego = useNegoInfo(uuids, scope);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: PA_ROOT });
  }, [queryClient]);
  const { refreshing, onRefresh } = usePullToRefresh(refresh);

  const activeCount = countPaFilters(filters);
  const filtered = hasActiveStagingFilters(filters) || (filters.affaire && !!filters.affaireId) || !!filters.distributorId;

  const onPress = useCallback(
    (item: StagingItem) => {
      if (selecting) {
        toggleSelect(item);
        return;
      }
      openPaFiche(item.uuid);
    },
    [selecting],
  );
  const onLongPress = useCallback((item: StagingItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    toggleSelect(item);
  }, []);
  const onPressCountry = useCallback((country: ViabilityCountry) => {
    patchPaFilters({ country: getPaFilters().country === country ? '' : country });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: StagingItem }) => {
      const card = (
        <StagingCard
          item={item}
          selected={selection.has(item.uuid)}
          selecting={selecting}
          openNego={nego.open[item.uuid]}
          requests={nego.requests[item.uuid]}
          focusCountry={filters.country}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressCountry={onPressCountry}
        />
      );
      return (
        <View style={styles.cardWrap}>
          {selecting ? card : <SwipeRow item={item}>{card}</SwipeRow>}
        </View>
      );
    },
    [selection, selecting, nego, filters.country, onPress, onLongPress, onPressCountry, styles.cardWrap],
  );

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              <HeaderButton
                label="Trier"
                icon={<ArrowDownUp size={20} color={t.accentText} />}
                dot={filters.sortBy !== 'lastAnalyzedAt' || filters.sortOrder !== 'desc'}
                onPress={openPaSort}
              />
              <HeaderButton
                label={`Filtres${activeCount > 0 ? `, ${activeCount} actif${activeCount > 1 ? 's' : ''}` : ''}`}
                icon={<SlidersHorizontal size={20} color={t.accentText} />}
                count={activeCount}
                onPress={openPaFilters}
              />
            </View>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder="Désignation, EAN, code eBat, marque"
        autoCapitalize="none"
        tintColor={t.accentText}
        // « automatic » place la recherche en bas sur iOS 26, sous le bouton Analyser et la barre de sélection.
        placement="stacked"
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
      />
      <FlatList
        data={list.items}
        extraData={selection}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (selecting ? 150 : 96) + insets.bottom },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        initialNumToRender={5}
        windowSize={9}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AnalysisBanner />
            <ViabilityTabs counts={counts.data} />
            <QuickFilters />
            <ActiveChips />
            <AffaireBanner />
            <View style={styles.summary}>
              <View style={styles.summaryText}>
                <Text style={styles.total}>
                  {list.total === null
                    ? 'Chargement…'
                    : `${formatInteger(list.total)} analyse${list.total > 1 ? 's' : ''}`}
                </Text>
                <Text style={styles.hint}>
                  {selecting ? 'Touchez pour cocher' : 'Appui long pour sélectionner'}
                </Text>
              </View>
              {list.isRefetching ? <ActivityIndicator size="small" color={t.accentText} /> : null}
              {filtered && (list.total ?? 0) > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mettre en négociation les ${list.total} résultats du filtre`}
                  onPress={() => openPaNego('filter')}
                  style={({ pressed }) => [styles.allNego, pressed && { opacity: 0.7 }]}
                >
                  <Handshake size={15} color={t.accentText} />
                  <Text style={styles.allNegoLabel}>Tout mettre en négo</Text>
                </Pressable>
              ) : null}
            </View>
            {list.error && list.items.length > 0 ? (
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger l'historique"
                onRetry={() => void onRefresh()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <View style={styles.cardWrap}>
              <ListSkeleton rows={4} height={190} />
            </View>
          ) : list.error ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger l'historique"
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : (
            <View style={styles.empty}>
              <EmptyState
                icon={<History size={24} color={t.textMuted} />}
                title="Aucune analyse"
                text={
                  filtered || filters.search
                    ? 'Aucune analyse ne correspond à ces filtres.'
                    : "Lancez votre première analyse avec le bouton « Analyser »."
                }
              />
              {filtered ? (
                <Button label="Effacer les filtres" variant="outline" onPress={resetPaFilters} />
              ) : null}
            </View>
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

      {!selecting ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Analyser un produit"
          onPress={() => openPaLauncher()}
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + spacing.lg },
            pressed && { opacity: 0.85 },
          ]}
        >
          <ScanSearch size={20} color={t.onAccent} />
          <Text style={styles.fabLabel}>Analyser</Text>
        </Pressable>
      ) : null}

      <SelectionBar loadedItems={list.items} />
    </View>
  );
}

/** Balayage vers la gauche : Négocier, et Supprimer quand la ligne est supprimable. */
function SwipeRow({ item, children }: { item: StagingItem; children: React.ReactNode }) {
  const styles = useStyles();
  const t = useTheme();
  const deletable = canDeleteStaging(item);

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.swipe}
      renderRightActions={(_progress, _translation, methods) => (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Négocier ce produit"
            onPress={() => {
              methods.close();
              openPaNego('item', item.uuid);
            }}
            style={[styles.action, { backgroundColor: t.accent }]}
          >
            <Handshake size={20} color={t.onAccent} />
            <Text style={[styles.actionLabel, { color: t.onAccent }]}>Négocier</Text>
          </Pressable>
          {deletable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Supprimer ce produit"
              onPress={() => {
                methods.close();
                void deleteStagingItems([item]);
              }}
              style={[styles.action, { backgroundColor: t.danger }]}
            >
              <Trash2 size={20} color="#fff" />
              <Text style={[styles.actionLabel, { color: '#fff' }]}>Supprimer</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

type HeaderButtonProps = {
  label: string;
  icon: React.ReactNode;
  count?: number;
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
  root: { flex: 1, backgroundColor: t.bg },
  content: { flexGrow: 1 },
  header: { gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  empty: { gap: spacing.lg, paddingHorizontal: spacing.xl },
  footer: { paddingVertical: spacing.xl },
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
  hint: { fontSize: fontSize.xs, color: t.textMuted },
  allNego: {
    minHeight: hitTarget - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: withAlpha(t.accent, 0.14),
  },
  allNegoLabel: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: t.accent,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabLabel: { fontSize: fontSize.base, fontWeight: '800', color: t.onAccent },
  swipe: { borderRadius: radius.md },
  actions: { flexDirection: 'row', gap: 2, marginLeft: spacing.xs },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
  },
  actionLabel: { fontSize: 11, fontWeight: '700' },
}));
