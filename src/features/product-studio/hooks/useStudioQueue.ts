import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { hubProductStudioJobsApi, studioJobKeys } from '@/api/hubProductStudioJobs';
import { usePollingInterval } from '@/features/discussions/shared/usePolling';
import type { StudioFacets, StudioReviewItem } from '@/types/hubStudioJobs';

import { buildProductBoard, type TodoEntry } from '../domain/board';
import { collectFacetOptions, hasActiveFacetFilters, matchesFacets } from '../domain/facets';
import { useQueueFilters, type TodoFilter } from '../queueFiltersStore';

/** Le score projeté est inférieur au score actuel : déployer dégraderait la fiche. */
export function isScoreDrop(item: Pick<StudioReviewItem, 'currentScore' | 'projectedScore'>): boolean {
  return (
    item.currentScore != null &&
    item.projectedScore != null &&
    item.projectedScore < item.currentScore
  );
}

const isRetryEntry = (entry: TodoEntry) =>
  entry.kind === 'failure' || (entry.kind === 'review' && entry.failure !== null);
const isWorseEntry = (entry: TodoEntry) =>
  entry.kind === 'review' && isScoreDrop(entry.item) && entry.activeJob === null;
const isReadyEntry = (entry: TodoEntry) =>
  entry.kind === 'review' &&
  entry.activeJob === null &&
  !entry.item.busy &&
  entry.item.preflight?.verdict === 'READY';
const isBlockedEntry = (entry: TodoEntry) =>
  entry.kind === 'review' &&
  entry.activeJob === null &&
  entry.item.preflight?.verdict === 'BLOCKED';

function matchesTodoFilter(filter: TodoFilter, entry: TodoEntry): boolean {
  if (filter === 'all') return true;
  if (filter === 'worse') return isWorseEntry(entry);
  if (filter === 'ready') return isReadyEntry(entry);
  if (filter === 'blocked') return isBlockedEntry(entry);
  return filter === 'retry' ? isRetryEntry(entry) : !isRetryEntry(entry);
}

function matchesSearch(needle: string, entry: TodoEntry): boolean {
  if (!needle) return true;
  const source =
    entry.kind === 'review'
      ? [entry.item.reference, entry.item.designation, entry.item.requestedByEmail]
      : [entry.job.reference, entry.job.requestedByEmail];
  return source.some((value) => (value ?? '').toLowerCase().includes(needle));
}

/**
 * Données de la file « À traiter » : les deux requêtes pollées (file 5 s, relecture 15 s, seulement
 * au focus), le tableau par produit (`buildProductBoard`) et tous les compteurs de la liste.
 * Les requêtes sont partagées par clé : la liste et la feuille des facettes l'appellent sans
 * doubler les appels réseau.
 */
export function useStudioQueue() {
  const queryClient = useQueryClient();
  const filters = useQueueFilters();
  const queueInterval = usePollingInterval(5_000);
  const reviewInterval = usePollingInterval(15_000);

  // Horloge grossière (10 s) : les âges et les cartes provisoires avancent sans recalcul constant.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);
  const nowBucket = Math.floor(now / 10_000);

  const queueQuery = useQuery({
    queryKey: studioJobKeys.queue(),
    queryFn: () => hubProductStudioJobsApi.queue(),
    refetchInterval: queueInterval,
    staleTime: 2_000,
  });
  const reviewQuery = useQuery({
    queryKey: studioJobKeys.review(),
    queryFn: () => hubProductStudioJobsApi.review(),
    refetchInterval: reviewInterval,
    staleTime: 5_000,
    retry: false,
  });

  const concurrency = queueQuery.data?.concurrency ?? 2;
  const allRunning = useMemo(() => queueQuery.data?.running ?? [], [queueQuery.data]);
  const allQueued = useMemo(() => queueQuery.data?.queued ?? [], [queueQuery.data]);
  const history = useMemo(() => queueQuery.data?.history ?? [], [queueQuery.data]);
  const products = queueQuery.data?.products;
  const reviewItems = useMemo(() => reviewQuery.data?.items ?? [], [reviewQuery.data]);

  const facetsActive = hasActiveFacetFilters(filters.facets);
  const matchesFacetFilters = useCallback(
    (source: StudioFacets) => matchesFacets(filters.facets, source),
    [filters.facets],
  );

  const board = useMemo(
    () =>
      buildProductBoard({
        running: allRunning,
        queued: allQueued,
        history,
        products,
        reviewItems,
        nowBucket,
        now: nowBucket * 10_000,
        matchesRequester: () => true,
        matchesFacets: matchesFacetFilters,
      }),
    [allRunning, allQueued, history, products, reviewItems, nowBucket, matchesFacetFilters],
  );
  const { toProcess } = board;

  const retryCount = toProcess.filter(isRetryEntry).length;
  const reviewCount = toProcess.length - retryCount;
  const worseItems = useMemo(
    () => toProcess.flatMap((e) => (e.kind === 'review' && isWorseEntry(e) ? [e.item] : [])),
    [toProcess],
  );
  const readyItems = useMemo(
    () => toProcess.flatMap((e) => (e.kind === 'review' && isReadyEntry(e) ? [e.item] : [])),
    [toProcess],
  );
  const blockedCount = toProcess.filter(isBlockedEntry).length;
  // Absent d'un back sans contrôle préalable : filtres « Prêtes » et déploiement groupé masqués.
  const hasPreflight = reviewQuery.data?.summary !== undefined;

  const needle = filters.search.trim().toLowerCase();
  const visibleToProcess = useMemo(
    () =>
      toProcess.filter(
        (entry) => matchesTodoFilter(filters.todo, entry) && matchesSearch(needle, entry),
      ),
    [toProcess, filters.todo, needle],
  );

  /** Références relisibles dans l'ordre affiché, hors fiches déjà en traitement. */
  const reviewableReferences = useMemo(
    () =>
      visibleToProcess.flatMap((e) =>
        e.kind === 'review' && !e.activeJob && !e.item.busy ? [e.item.reference] : [],
      ),
    [visibleToProcess],
  );

  // Valeurs des sélecteurs de facettes : même tableau sans filtre de facettes.
  const unfacetedBoard = useMemo(
    () =>
      buildProductBoard({
        running: allRunning,
        queued: allQueued,
        history,
        products,
        reviewItems,
        nowBucket,
        now: nowBucket * 10_000,
        matchesRequester: () => true,
        doneLimit: 0,
      }),
    [allRunning, allQueued, history, products, reviewItems, nowBucket],
  );
  const facetOptions = useMemo(() => {
    const sources: StudioFacets[] = unfacetedBoard.toProcess
      .filter((e) => matchesTodoFilter(filters.todo, e) && matchesSearch(needle, e))
      .map((e) => (e.kind === 'review' ? e.item : e.job));
    return collectFacetOptions(sources, filters.facets);
  }, [unfacetedBoard, filters.todo, filters.facets, needle]);

  // Dès qu'un traitement se termine, la relecture est rechargée sans attendre son cycle de 15 s.
  const previousStatusRef = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    if (!queueQuery.data) return;
    const next = new Map(
      [...allRunning, ...allQueued, ...history].map((job) => [job.id, job.status]),
    );
    const previous = previousStatusRef.current;
    previousStatusRef.current = next;
    if (!previous) return;
    const finished = [...next].some(
      ([id, status]) => (status === 'DONE' || status === 'PARTIAL') && previous.get(id) !== status,
    );
    if (finished) void queryClient.invalidateQueries({ queryKey: studioJobKeys.review() });
  }, [queryClient, queueQuery.data, allRunning, allQueued, history]);

  const refetch = useCallback(
    () => Promise.all([queueQuery.refetch(), reviewQuery.refetch()]),
    [queueQuery, reviewQuery],
  );

  return {
    now,
    queueQuery,
    reviewQuery,
    concurrency,
    allRunning,
    allQueued,
    reviewItems,
    board,
    toProcess,
    visibleToProcess,
    reviewableReferences,
    readyItems,
    worseItems,
    blockedCount,
    retryCount,
    reviewCount,
    hasPreflight,
    facetsActive,
    facetOptions,
    refetch,
  };
}
