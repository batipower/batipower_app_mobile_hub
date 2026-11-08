import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { partnerOpportunitiesApi } from '@/api/partnerOpportunities';
import { errorMessage } from '@/features/preparation/components/ListState';
import type { PartnerOpportunityDetail } from '@/types/partnerOpportunities';

import { PARTNER_OPPORTUNITIES_KEY, partnerOpportunityDetailKey } from '../../queryKeys';

/**
 * Actions simples d'une opportunité : traitée / rouverte et marquée non lue. Chaque succès
 * recale la liste, les compteurs et le badge de l'onglet (même préfixe de clé de cache).
 */
export function useOpportunityActions(uuid: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: PARTNER_OPPORTUNITIES_KEY });
  const done = () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );

  const treat = useMutation({
    mutationFn: () => partnerOpportunitiesApi.markTreated(uuid),
    onSuccess: (detail: PartnerOpportunityDetail) => {
      queryClient.setQueryData(partnerOpportunityDetailKey(uuid), detail);
      void refresh();
      done();
      toast.success('Opportunité marquée traitée');
    },
    onError: (error) => toast.error(errorMessage(error, 'Impossible de marquer traitée.')),
  });

  const untreat = useMutation({
    mutationFn: () => partnerOpportunitiesApi.unmarkTreated(uuid),
    onSuccess: (detail: PartnerOpportunityDetail) => {
      queryClient.setQueryData(partnerOpportunityDetailKey(uuid), detail);
      void refresh();
      done();
      toast.success('Statut « traitée » annulé');
    },
    onError: (error) => toast.error(errorMessage(error, "Impossible d'annuler le statut.")),
  });

  const markUnread = useMutation({
    mutationFn: () => partnerOpportunitiesApi.markUnread(uuid),
    onSuccess: () => {
      void refresh();
      done();
      toast.success('Marquée comme non lue');
    },
    onError: (error) => toast.error(errorMessage(error, 'Impossible de marquer non lue.')),
  });

  return { treat, untreat, markUnread };
}

/** Marque l'opportunité comme lue à l'ouverture de la fiche (une seule fois, comme le web). */
export function useMarkOpportunityRead(uuid: string | undefined) {
  const queryClient = useQueryClient();
  const marked = useRef<string | null>(null);

  useEffect(() => {
    if (!uuid || marked.current === uuid) return;
    marked.current = uuid;
    partnerOpportunitiesApi
      .markRead(uuid)
      .then(() => queryClient.invalidateQueries({ queryKey: PARTNER_OPPORTUNITIES_KEY }))
      .catch(() => undefined);
  }, [uuid, queryClient]);
}
