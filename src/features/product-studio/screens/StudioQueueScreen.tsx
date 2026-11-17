import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { ClipboardCheck, PlayCircle, Rocket, SlidersHorizontal } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubStudioQueue } from '@/auth/permissions';
import { FilterPill } from '@/components/sheet/FilterPill';
import { Button } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StudioReviewItem } from '@/types/hubStudioJobs';

import { JobCard, ReviewCard } from '../components/EntryCards';
import type { TodoEntry } from '../domain/board';
import { deployBlockedReason } from '../domain/queue';
import { useQueueActions } from '../hooks/useQueueActions';
import { useStudioQueue } from '../hooks/useStudioQueue';
import { openQueueFilters, openStudio, openStudioReview } from '../navigation';
import { patchQueueFilters, useQueueFilters, type TodoFilter } from '../queueFiltersStore';

const keyExtractor = (entry: TodoEntry) => entry.key;

/** File des fiches produit « À traiter » du HUB, réservée au SUPERADMIN (comme `/hub/fiches-produit/file`). */
export function StudioQueueScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubStudioQueue(user.role) ? (
    <QueueList />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="La file des fiches produit est réservée aux comptes Super Admin."
    />
  );
}

function QueueList() {
  const styles = useStyles();
  const t = useTheme();
  const filters = useQueueFilters();
  const queue = useStudioQueue();
  const actions = useQueueActions();
  const { refreshing, onRefresh } = usePullToRefresh(queue.refetch);

  const {
    visibleToProcess,
    reviewableReferences,
    readyItems,
    worseItems,
    blockedCount,
    retryCount,
    reviewCount,
    hasPreflight,
    facetsActive,
    toProcess,
    now,
    reviewItems,
  } = queue;

  const activeFacetCount =
    filters.facets.brands.length +
    filters.facets.categoryTypes.length +
    filters.facets.affaires.length +
    (filters.facets.stock !== 'all' ? 1 : 0);

  const onReview = useCallback(
    (item: StudioReviewItem) => {
      if (reviewableReferences.includes(item.reference)) {
        openStudioReview(reviewableReferences, item.reference);
      } else {
        openStudio(item.reference);
      }
    },
    [reviewableReferences],
  );

  const { confirmDeploy, confirmDismissReview, confirmDismissJob, prepareMutation, retry } = actions;

  const onDeploy = useCallback(
    (item: StudioReviewItem, failure: { type: string } | null) => {
      if (failure?.type === 'PREPARE') prepareMutation.mutate(item.reference);
      else confirmDeploy(item.reference);
    },
    [confirmDeploy, prepareMutation],
  );

  const chips: [TodoFilter, string, number][] = [
    ['all', 'Tout', toProcess.length],
    ...(hasPreflight
      ? ([
          ['ready', 'Prêtes', readyItems.length],
          ['blocked', 'À corriger', blockedCount],
        ] as [TodoFilter, string, number][])
      : []),
    ['review', 'À relire', reviewCount],
    ['retry', 'À reprendre', retryCount],
    ['worse', 'Score en baisse', worseItems.length],
  ];

  const connectionLost = queue.queueQuery.isError;
  const loading = queue.reviewQuery.isPending && queue.queueQuery.isPending;
  const slots = Math.max(1, queue.concurrency);

  const renderItem = ({ item: entry }: { item: TodoEntry }) => {
    if (entry.kind === 'review') {
      return (
        <View style={styles.cardWrap}>
          <ReviewCard
            item={entry.item}
            now={now}
            deployBlockedReason={deployBlockedReason(entry.item)}
            failure={entry.failure}
            activeJob={entry.activeJob}
            retrying={actions.pendingReference === entry.item.reference}
            onReview={onReview}
            onDeploy={onDeploy}
            onDismiss={(target) => confirmDismissReview([target])}
          />
        </View>
      );
    }
    return (
      <View style={styles.cardWrap}>
        <JobCard
          kind={entry.kind}
          job={entry.job}
          now={now}
          retrying={actions.pendingReference === entry.job.reference}
          onRetry={(job) => retry(job, reviewItems.find((i) => i.reference === job.reference))}
          onRework={(job) => openStudio(job.reference)}
          onDismiss={confirmDismissJob}
        />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filtres${activeFacetCount > 0 ? `, ${activeFacetCount} actif${activeFacetCount > 1 ? 's' : ''}` : ''}`}
              hitSlop={6}
              onPress={openQueueFilters}
              style={styles.headerButton}
            >
              <SlidersHorizontal size={20} color={t.accentText} />
              {activeFacetCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeFacetCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder="Référence, désignation, demandeur"
        autoCapitalize="none"
        tintColor={t.accentText}
        // « automatic » place la recherche en bas sur iOS 26 : « stacked » la garde sous le titre.
        placement="stacked"
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => patchQueueFilters({ search: event.nativeEvent.text })}
        onCancelButtonPress={() => patchQueueFilters({ search: '' })}
      />
      <FlatList
        data={visibleToProcess}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            <View style={styles.processing}>
              <View style={styles.processingTop}>
                <Text style={styles.processingTitle}>Traitement</Text>
                <Text style={styles.processingText}>
                  {queue.allRunning.length}/{slots} en parallèle · {queue.allQueued.length} en attente
                  {connectionLost ? ' · connexion perdue' : ''}
                </Text>
              </View>
              <View style={styles.slots}>
                {Array.from({ length: slots }, (_, index) => {
                  const job = queue.allRunning[index];
                  return (
                    <View key={job?.id ?? `free-${index}`} style={styles.slot}>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            { width: `${job ? Math.round(job.progress) : 0}%`, backgroundColor: t.info },
                          ]}
                        />
                      </View>
                      <Text style={styles.slotText} numberOfLines={1}>
                        {job
                          ? `${job.reference} · ${job.steps?.find((s) => s.status === 'running')?.label ?? 'en cours'}`
                          : 'Emplacement libre'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {queue.queueQuery.isError && toProcess.length > 0 ? (
              <View style={styles.padded}>
                <ErrorBanner
                  error={queue.queueQuery.error}
                  fallback="Impossible de charger la file"
                  onRetry={() => void onRefresh()}
                />
              </View>
            ) : null}

            <View style={styles.padded}>
              <Button
                label={`Commencer la relecture (${reviewableReferences.length})`}
                leadingIcon={<PlayCircle size={16} color={t.onAccent} />}
                disabled={reviewableReferences.length === 0}
                onPress={() => openStudioReview(reviewableReferences)}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled"
            >
              {chips.map(([value, label, total]) => (
                <FilterPill
                  key={value}
                  label={`${label} · ${total}`}
                  state={filters.todo === value ? 'on' : 'off'}
                  onPress={() => patchQueueFilters({ todo: value })}
                />
              ))}
            </ScrollView>

            {(hasPreflight && readyItems.length > 0) ||
            (filters.todo === 'worse' && worseItems.length > 0) ? (
              <View style={[styles.padded, styles.bulk]}>
                {hasPreflight && readyItems.length > 0 ? (
                  <Button
                    label={`Déployer les ${readyItems.length} fiche${readyItems.length > 1 ? 's' : ''} prête${readyItems.length > 1 ? 's' : ''}`}
                    variant="outline"
                    leadingIcon={<Rocket size={14} color={t.text} />}
                    loading={actions.deployReadyPending}
                    onPress={() => actions.confirmDeployReady(readyItems)}
                  />
                ) : null}
                {filters.todo === 'worse' && worseItems.length > 0 ? (
                  <Button
                    label={`Écarter ces ${worseItems.length} fiches`}
                    variant="ghost"
                    onPress={() => confirmDismissReview(worseItems)}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.cardWrap}>
              <ListSkeleton rows={4} height={170} />
            </View>
          ) : queue.reviewQuery.isError && toProcess.length === 0 ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={queue.reviewQuery.error}
                fallback="Liste indisponible pour le moment."
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : (
            <EmptyState
              icon={<ClipboardCheck size={24} color={t.textMuted} />}
              title="Rien à traiter"
              text={
                facetsActive
                  ? 'Aucune fiche pour ces filtres.'
                  : filters.todo !== 'all' || filters.search
                    ? 'Aucune fiche dans ce filtre.'
                    : 'Toutes les fiches ont été traitées pour le moment.'
              }
            />
          )
        }
      />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: spacing['4xl'] },
  header: { gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  padded: { paddingHorizontal: spacing.xl },
  bulk: { gap: spacing.sm },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  chips: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  processing: {
    marginHorizontal: spacing.xl,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
  },
  processingTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  processingTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: t.text,
  },
  processingText: { flexShrink: 1, fontSize: 11, color: t.textMuted },
  slots: { gap: spacing.xs + 2 },
  slot: { gap: 3 },
  slotText: { fontSize: 11, color: t.textMuted },
  track: { height: 6, borderRadius: radius.full, overflow: 'hidden', backgroundColor: t.surface },
  fill: { height: '100%', borderRadius: radius.full },
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
