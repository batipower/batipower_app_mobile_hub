import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubAnalysesLiveApi, type LiveSnapshot } from '@/api/hubAnalysesLive';

import { subscribeAnalysesLive } from '../analysesLiveSocket';

export const ANALYSES_LIVE_KEY = ['hub-analyses-live'] as const;

/** Repli (socket indisponible) : écran ouvert, l'état d'un poste bouge à chaque étape, on suit de près. */
const WATCH_REFRESH_MS = 3_000;
/** Repli (socket indisponible) : pastille du cockpit, un simple compteur. */
const PILL_REFRESH_MS = 20_000;

/**
 * Un snapshot poussé plus ancien que celui déjà en cache (même process API) est périmé : on l'ignore. Un autre
 * `serverBootId` signifie que l'API a redémarré (la séquence repart de 1) : on l'accepte toujours.
 */
function isStale(incoming: LiveSnapshot, cached: LiveSnapshot | undefined): boolean {
  if (!cached || incoming.seq == null || cached.seq == null) return false;
  if (incoming.serverBootId !== cached.serverBootId) return false;
  return incoming.seq < cached.seq;
}

/**
 * Analyses en cours des postes. Les données arrivent en temps réel par WebSocket (`/analyses-live`) et
 * alimentent le cache de la requête ; la lecture périodique de `GET live` ne sert que de repli tant que la
 * socket n'est pas connectée (back ancien, réseau, app en arrière-plan). `realtime` indique le mode actif.
 * `watching` (page ouverte) : repli toutes les 3 s, sinon (pastille du cockpit) toutes les 20 s.
 */
export function useAnalysesLive({
  watching,
  enabled = true,
}: {
  watching: boolean;
  enabled?: boolean;
}) {
  const focused = useIsFocused();
  const queryClient = useQueryClient();
  const [realtime, setRealtime] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setRealtime(false);
      return;
    }
    return subscribeAnalysesLive({
      onSnapshot: (snapshot) => {
        const cached = queryClient.getQueryData<LiveSnapshot>(ANALYSES_LIVE_KEY);
        if (isStale(snapshot, cached)) return;
        queryClient.setQueryData(ANALYSES_LIVE_KEY, snapshot);
      },
      onStatus: (status) => setRealtime(status === 'connected'),
    });
  }, [enabled, queryClient]);

  const query = useQuery({
    queryKey: ANALYSES_LIVE_KEY,
    queryFn: async ({ signal }) => {
      const fetched = await hubAnalysesLiveApi.get({ signal });
      // Une lecture HTTP partie avant un snapshot poussé ne doit pas l'écraser.
      const cached = queryClient.getQueryData<LiveSnapshot>(ANALYSES_LIVE_KEY);
      if (
        cached?.seq != null &&
        cached.serverBootId === fetched.serverBootId &&
        Date.parse(cached.generatedAt) >= Date.parse(fetched.generatedAt)
      ) {
        return cached;
      }
      return fetched;
    },
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: focused && !realtime ? (watching ? WATCH_REFRESH_MS : PILL_REFRESH_MS) : false,
    // En temps réel les données sont toujours fraîches.
    staleTime: realtime ? Number.POSITIVE_INFINITY : 2_000,
  });

  return {
    ...query,
    realtime,
    // Une lecture HTTP en échec n'est pas une erreur tant que la socket fournit les données.
    isError: query.isError && !realtime,
  };
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

/** Arrêt et relance à distance d'un poste ; chaque action relit le snapshot. */
export function usePosteControlActions() {
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ANALYSES_LIVE_KEY }),
    [queryClient],
  );

  const pause = useMutation({
    mutationFn: (posteKey: string) => hubAnalysesLiveApi.pausePoste(posteKey),
    onSuccess: () => {
      toast.success('Poste arrêté : sa file est gelée.');
      void refresh();
    },
    onError: (error) => toast.error(messageOf(error, "Impossible d'arrêter le poste.")),
  });

  const resume = useMutation({
    mutationFn: (posteKey: string) => hubAnalysesLiveApi.resumePoste(posteKey),
    onSuccess: () => {
      toast.success('Poste relancé : sa file reprend.');
      void refresh();
    },
    onError: (error) => toast.error(messageOf(error, 'Impossible de relancer le poste.')),
  });

  return { pause, resume };
}
