import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { FileSearch, Plus } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCustomerQuotes } from '@/auth/permissions';
import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { useTabBarInset } from '@/components/navigation/tabBarInset';
import { Chip } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { PipelineCard } from './components/PipelineCard';
import { useQuotePipeline, useSegmentCounts } from './hooks/useQuotePipeline';
import { openNewQuote, openQuote, openQuoteRequest } from './navigation';
import { SEGMENTS, type PipelineItem, type SegmentId } from './pipeline';

const keyExtractor = (item: PipelineItem) => `${item.kind}:${item.id}`;

/** Devis clients du HUB (SUPERADMIN) : demandes du site et devis, par segment. */
export function QuotesScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubCustomerQuotes(user.role) ? (
    <Pipeline />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="Les devis clients sont réservés aux comptes Super Admin."
    />
  );
}

function Pipeline() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const [segment, setSegment] = useState<SegmentId>('DEMANDES');
  const [text, setText] = useState('');
  const search = useDebouncedTerm(text);

  const list = useQuotePipeline(segment, search);
  const counts = useSegmentCounts();
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([list.refetch(), counts.refetch()]);
  });

  // Les demandes sont filtrées après pagination (archivées / refusées retirées) : une page peut
  // être presque vide alors qu'il en reste, auquel cas on charge la suivante sans attendre le défilement.
  const { items, hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const tooShort = items.length < 8;
  useEffect(() => {
    if (tooShort && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [tooShort, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const open = (item: PipelineItem) => {
    if (item.kind === 'DEMANDE') openQuoteRequest(item.id);
    else openQuote(item.id);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Devis
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Nouveau devis"
            hitSlop={6}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
              openNewQuote();
            }}
          >
            <Plus size={22} color={t.onAccent} />
          </Pressable>
          <ModuleSwitcherButton active="HUB" />
        </View>
      </View>

      <View style={styles.block}>
        <SearchBar value={text} onChangeText={setText} placeholder="Client, e-mail, référence…" />
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityRole="tablist"
        >
          {SEGMENTS.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              count={counts.data?.[s.id]}
              active={segment === s.id}
              onPress={() => setSegment(s.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <PipelineCard item={item} onPress={open} />
          </View>
        )}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
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
          list.error && items.length > 0 ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger les devis"
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          list.loading ? (
            <View style={styles.cardWrap}>
              <ListSkeleton rows={5} height={96} />
            </View>
          ) : list.error ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={list.error}
                fallback="Impossible de charger les devis"
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : (
            <EmptyState
              icon={<FileSearch size={24} color={t.textMuted} />}
              title={search ? 'Aucun résultat' : 'Rien ici pour le moment'}
              text={
                search
                  ? 'Aucun élément ne correspond à cette recherche.'
                  : 'Aucun élément dans ce segment.'
              }
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage || list.isRefetching ? (
            <View style={styles.footer}>
              <ActivityIndicator color={t.accentText} />
            </View>
          ) : undefined
        }
      />
    </View>
  );
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  block: { paddingHorizontal: spacing.xl },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  content: { flexGrow: 1 },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  footer: { paddingVertical: spacing.xl },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: t.accent,
  },
  addButtonPressed: { backgroundColor: t.accentPressed, transform: [{ scale: 0.95 }] },
}));
