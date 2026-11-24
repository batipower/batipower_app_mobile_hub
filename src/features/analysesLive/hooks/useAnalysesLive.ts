import { useCallback } from 'react';
import { useIsFocused } from 'expo-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubAnalysesLiveApi } from '@/api/hubAnalysesLive';

export const ANALYSES_LIVE_KEY = ['hub-analyses-live'] as const;

/** Écran ouvert : l'état d'un poste bouge à chaque étape, on suit de près. */
const WATCH_REFRESH_MS = 3_000;
/** Pastille du cockpit : un simple compteur, inutile de solliciter l'API plus souvent. */
const PILL_REFRESH_MS = 20_000;

/**
 * Analyses en cours des postes. `watching` (page ouverte) rafraîchit toutes les 3 s, sinon
 * (pastille du cockpit) toutes les 20 s ; rien tant que l'écran n'est pas au premier plan.
 */
export function useAnalysesLive({
  watching,
  enabled = true,
}: {
  watching: boolean;
  enabled?: boolean;
}) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: ANALYSES_LIVE_KEY,
    queryFn: ({ signal }) => hubAnalysesLiveApi.get({ signal }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: focused ? (watching ? WATCH_REFRESH_MS : PILL_REFRESH_MS) : false,
    staleTime: 2_000,
  });
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
