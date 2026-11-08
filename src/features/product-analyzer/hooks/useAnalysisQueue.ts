import { useCallback, useMemo } from 'react';

import { computePipeline, useAnalyzerState, useElapsed } from '@/features/product-analyzer/hooks/useSingleAnalysis';
import { useAnalyzerEngine } from '@/features/product-analyzer/socket/AnalyzerSocketProvider';
import type { QueueSeed, QueueSource } from '@/features/product-analyzer/socket/types';

/** File d'analyses (relance d'une sélection, réserve) : un produit à la fois, poids ignoré. */
export function useAnalysisQueue() {
  const engine = useAnalyzerEngine();
  const { connection, live, queue, single } = useAnalyzerState();

  const counts = useMemo(() => {
    let done = 0;
    let failed = 0;
    let notFound = 0;
    for (const item of queue.items) {
      if (item.status === 'done') done += 1;
      else if (item.status === 'ebat_not_found') notFound += 1;
      else if (item.status === 'error' || item.status === 'blocked') failed += 1;
    }
    const processed = done + failed + notFound;
    return { total: queue.items.length, done, failed, notFound, processed };
  }, [queue.items]);

  const pipeline = useMemo(() => computePipeline(live, false), [live]);
  const elapsed = useElapsed(live.startedAt, queue.running);
  const totalElapsed = useElapsed(queue.startedAt, queue.running);

  const start = useCallback(
    (seeds: QueueSeed[], source: QueueSource) => engine.startQueue(seeds, source),
    [engine],
  );
  const stop = useCallback(() => engine.stopQueue(), [engine]);
  const close = useCallback(() => engine.closeQueue(), [engine]);

  const singleBusy = single.phase === 'pending' || single.phase === 'running';

  return {
    connection,
    queue,
    live,
    pipeline,
    counts,
    elapsed,
    totalElapsed,
    current: queue.items[queue.currentIdx] ?? null,
    singleBusy,
    start,
    stop,
    close,
  };
}
