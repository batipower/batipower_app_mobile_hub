import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { fmtCur } from '@/features/product-analyzer/lib/helpers';
import { MP_FLAGS, MP_KEYS, STEPS_DEF } from '@/features/product-analyzer/lib/constants';
import { useAnalyzerEngine } from '@/features/product-analyzer/socket/AnalyzerSocketProvider';
import type {
  AnalyzeRequest,
  EngineState,
  LiveJob,
} from '@/features/product-analyzer/socket/types';
import type { StepStatus } from '@/types/hubProductAnalyzer';

/** État complet du moteur d'analyse (connexion, job en cours, analyse unitaire, file). */
export function useAnalyzerState(): EngineState {
  const engine = useAnalyzerEngine();
  return useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
}

export type PipelineView = {
  /** Statut de l'étape « ventes marketplace », déduit des pays reçus. */
  salesStatus: StepStatus;
  doneCount: number;
  totalSteps: number;
  currentStep: (typeof STEPS_DEF)[number] | null;
  /** Faits saillants collectés au fil de l'analyse (désignation, ASIN, prix BuyBox…). */
  snippets: string[];
  salesReceived: number;
  salesExpected: number;
};

/** Progression de l'analyse en cours, calculée comme `useSingleAnalysis` du web. */
export function computePipeline(live: LiveJob, finished: boolean): PipelineView {
  const { steps, mpData } = live;
  const jsStep = steps['4_start'];
  const jsStarted = !!jsStep && (jsStep.status === 'running' || jsStep.status === 'done');
  const jsSkipped = jsStep?.status === 'skipped';
  const salesExpected = (jsStep?.data?.totalCountries as number) || MP_KEYS.length;
  const salesReceived = Object.keys(mpData).length;
  const allDone = salesReceived >= salesExpected;

  let salesStatus: StepStatus;
  if (jsSkipped) salesStatus = 'skipped';
  else if (finished || allDone) salesStatus = 'done';
  else if (jsStarted) salesStatus = 'running';
  else salesStatus = jsStep?.status ?? 'idle';

  const statusOf = (key: string): StepStatus =>
    key === '4_start' ? salesStatus : (steps[key]?.status ?? 'idle');

  let doneCount = 0;
  let currentStep: PipelineView['currentStep'] = null;
  for (const def of STEPS_DEF) {
    const status = statusOf(def.key);
    if (status === 'done' || status === 'skipped') doneCount += 1;
    if (!currentStep && (status === 'running' || status === 'waiting')) currentStep = def;
  }

  const snippets: string[] = [];
  const eb = steps['1']?.data;
  if (eb?.designation) snippets.push(`📦 ${eb.designation as string}`);
  if (eb?.brand) snippets.push(`🏷️ ${eb.brand as string}`);
  if (eb?.ean) snippets.push(`EAN ${eb.ean as string}`);
  const az = steps['2']?.data;
  if (az?.asin) snippets.push(`ASIN ${az.asin as string}`);
  if (az?.buyboxPriceTTC) snippets.push(`BuyBox ${fmtCur(az.buyboxPriceTTC as number)} TTC`);
  const markets: [string, string, string][] = [
    ['2b_manomano', '🛒', 'ManoMano'],
    ['2c_leroymerlin', '🏠', 'Leroy Merlin'],
    ['2d_castorama', '🔨', 'Castorama'],
  ];
  for (const [key, icon, name] of markets) {
    const step = steps[key];
    if (step?.status === 'done' && step.data) {
      snippets.push(`${icon} ${name} ${(step.data.found as boolean) ? '✓' : '✗'}`);
    }
  }
  const weight = steps['3_weight']?.data;
  if (weight?.weightGrams) snippets.push(`⚖️ ${weight.weightGrams as number} g`);
  const transport = steps['3_transport']?.data;
  if (transport?.costHT) snippets.push(`🚚 ${fmtCur(transport.costHT as number)} HT`);
  for (const [country, entry] of Object.entries(mpData)) {
    if (entry.status === 'done' && entry.data?.unitsSold30d) {
      snippets.push(`${MP_FLAGS[country] ?? country} ${entry.data.unitsSold30d as number} ventes/30j`);
    }
  }

  return {
    salesStatus,
    doneCount,
    totalSteps: STEPS_DEF.length,
    currentStep,
    snippets,
    salesReceived,
    salesExpected,
  };
}

/** Chronomètre : millisecondes écoulées depuis `startedAt`, rafraîchies tant que `active`. */
export function useElapsed(startedAt: number | null, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || !startedAt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recale l'horloge au démarrage du chronomètre
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active, startedAt]);
  return startedAt ? Math.max(0, now - startedAt) : 0;
}

/** Analyse unitaire : état du job en cours et actions (lancer, annuler, saisir le poids…). */
export function useSingleAnalysis() {
  const engine = useAnalyzerEngine();
  const { connection, live, single, queue } = useAnalyzerState();

  const active = single.phase === 'pending' || single.phase === 'running';
  const finished = single.phase === 'completing';
  const pipeline = useMemo(() => computePipeline(live, finished), [live, finished]);
  const elapsed = useElapsed(live.startedAt, active);

  const start = useCallback((request: AnalyzeRequest) => engine.startSingle(request), [engine]);
  const retry = useCallback(() => engine.retrySingle(), [engine]);
  const cancel = useCallback(() => engine.cancelSingle(), [engine]);
  const respondWeight = useCallback((grams: number) => engine.respondWeight(grams), [engine]);
  const reset = useCallback(() => engine.resetSingle(), [engine]);

  return {
    connection,
    single,
    live,
    pipeline,
    active,
    elapsed: single.elapsedMs > 0 && !active ? single.elapsedMs : elapsed,
    /** Une file occupe le serveur : l'analyse unitaire est indisponible. */
    queueBusy: queue.running,
    start,
    retry,
    cancel,
    respondWeight,
    reset,
  };
}
