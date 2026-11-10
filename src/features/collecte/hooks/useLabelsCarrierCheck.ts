import { useEffect, useMemo, useState } from 'react';

import { hubCollecteApi } from '@/api/hubCollecte';
import type { LabelCarrierCheck } from '@/types/hubCollecte';

import type { CarrierCheckEntry } from '../display';

/** Pause entre deux contrôles : ménage les limites de débit du transporteur (GLS en particulier). */
const PAUSE_BETWEEN_CHECKS_MS = 300;
const CLIENT_CACHE_MS = 60_000;

const cache = new Map<string, { at: number; check: LabelCarrierCheck }>();

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Contrôle transporteur des étiquettes de la commande ouverte, UNE à la fois (jamais deux
 * requêtes en parallèle), dans l'ordre reçu. La file s'arrête à la fermeture de la feuille ou au
 * changement de commande ; un résultat de moins d'une minute n'est pas redemandé.
 */
export function useLabelsCarrierCheck(reference: string | null, trackingNumbers: string[]) {
  // Résultats rangés par file : ceux d'une file précédente sont ignorés, sans remise à zéro d'état.
  const [state, setState] = useState<{ key: string; map: Record<string, CarrierCheckEntry> }>({
    key: '',
    map: {},
  });
  const queueKey = reference ? `${reference}|${trackingNumbers.join('|')}` : '';

  const entries = useMemo(() => {
    const map = state.key === queueKey ? state.map : {};
    const result: Record<string, CarrierCheckEntry> = {};
    if (!reference) return result;
    for (const tracking of trackingNumbers) {
      result[tracking] = map[tracking] ?? { status: 'queued' };
    }
    return result;
    // `queueKey` résume reference + suivis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, queueKey]);

  useEffect(() => {
    if (!reference || trackingNumbers.length === 0) return;

    const controller = new AbortController();
    const { signal } = controller;

    const put = (tracking: string, entry: CarrierCheckEntry) =>
      setState((prev) => ({
        key: queueKey,
        map: { ...(prev.key === queueKey ? prev.map : {}), [tracking]: entry },
      }));

    void (async () => {
      let first = true;
      for (const tracking of trackingNumbers) {
        if (signal.aborted) return;

        const hit = cache.get(`${reference}:${tracking}`);
        if (hit && Date.now() - hit.at < CLIENT_CACHE_MS) {
          put(tracking, { status: 'done', check: hit.check });
          continue;
        }

        if (!first) await pause(PAUSE_BETWEEN_CHECKS_MS, signal);
        if (signal.aborted) return;
        first = false;

        put(tracking, { status: 'running' });
        try {
          const check = await hubCollecteApi.checkLabelCarrier(reference, tracking, { signal });
          if (signal.aborted) return;
          if (check.state !== 'UNAVAILABLE') {
            cache.set(`${reference}:${tracking}`, { at: Date.now(), check });
          }
          put(tracking, { status: 'done', check });
        } catch {
          if (signal.aborted) return;
          put(tracking, { status: 'error' });
        }
      }
    })();

    return () => controller.abort();
    // `queueKey` résume reference + suivis : la file ne repart que si l'un des deux change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueKey]);

  return { entries };
}
