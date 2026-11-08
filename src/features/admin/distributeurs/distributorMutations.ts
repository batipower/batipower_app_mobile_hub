import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { toast } from 'sonner-native';

import { adminEbatproApi, adminPartnersApi } from '@/api/adminPartners';
import { errorMessage } from '@/features/preparation/components/ListState';
import type { AdminDistributor, AdminDistributorWarehouse, AdminSubsidiary, EbatproAccount } from '@/types/adminPartners';

import { useRefreshPartners } from './hooks';
import {
  SENSITIVE_DISTRIBUTOR_SLUGS,
  formatTrace,
  totalPendingOrders,
} from './utils';

export type DeleteTarget =
  | { kind: 'distributor'; item: AdminDistributor }
  | { kind: 'warehouse'; distributor: AdminDistributor; item: AdminDistributorWarehouse }
  | { kind: 'subsidiary'; item: AdminSubsidiary }
  | { kind: 'ebatpro'; item: EbatproAccount };

function deleteLabel(t: DeleteTarget): string {
  if (t.kind === 'distributor') return `le distributeur « ${t.item.name} »`;
  if (t.kind === 'warehouse') return `l'entrepôt ${t.item.name} de « ${t.distributor.name} »`;
  if (t.kind === 'ebatpro') return `le compte eBatPro « ${t.item.label} »`;
  return `la filiale « ${t.item.name} »`;
}

/** Suppression confirmée d'un distributeur, entrepôt, filiale ou compte eBatPro. */
export function useDeleteEntity(options?: { onDeleted?: (target: DeleteTarget) => void }) {
  const refresh = useRefreshPartners();
  const mutation = useMutation({
    mutationFn: async (target: DeleteTarget) => {
      if (target.kind === 'distributor') return adminPartnersApi.deleteDistributor(target.item.id);
      if (target.kind === 'warehouse') return adminPartnersApi.removeWarehouse(target.distributor.id, target.item.id);
      if (target.kind === 'ebatpro') return adminEbatproApi.remove(target.item.id);
      return adminPartnersApi.deleteSubsidiary(target.item.id);
    },
    onSuccess: async (_r, target) => {
      toast.success('Supprimé');
      await refresh();
      options?.onDeleted?.(target);
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors de la suppression')),
  });

  const confirm = (target: DeleteTarget) =>
    Alert.alert(
      'Supprimer ?',
      `Vous allez supprimer ${deleteLabel(target)}. Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => mutation.mutate(target) },
      ],
    );

  return { confirm, isPending: mutation.isPending };
}

/** Affectation des commandes d'un distributeur (tous ses entrepôts). */
export function useOrdersAffectationToggle(distributor: AdminDistributor) {
  const refresh = useRefreshPartners();
  const mutation = useMutation({
    mutationFn: (next: boolean) => adminPartnersApi.setOrdersAffectation(distributor.id, next),
    onSuccess: async (res) => {
      toast.success(
        res.ordersAffectationEnabled
          ? `Affectation des commandes activée pour ${distributor.name}`
          : `Affectation des commandes coupée pour ${distributor.name}`,
      );
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors du changement d'affectation")),
  });

  const request = (next: boolean) => {
    const closing = !next;
    const sensitive = SENSITIVE_DISTRIBUTOR_SLUGS.includes(distributor.slug);
    const pending = totalPendingOrders(distributor);
    const warnings: string[] = [];
    if (closing && sensitive) {
      warnings.push(
        `Attention : ${distributor.name} est un réseau historique. Bertrand replie alors sur le QG Batipower (traitement manuel) pour les produits stockés chez lui.`,
      );
    }
    if (closing && pending > 0) {
      warnings.push(`${pending} commande${pending > 1 ? 's' : ''} en cours de traitement chez ce distributeur.`);
    }
    Alert.alert(
      closing ? 'Couper l’affectation des commandes ?' : 'Ouvrir l’affectation des commandes ?',
      [
        closing
          ? `Plus aucune NOUVELLE commande ne sera affectée aux entrepôts de « ${distributor.name} » (Bertrand, transfert manuel, découpage) ; le QG Batipower reste toujours affectable. Les commandes déjà affectées restent traitables.`
          : `Les entrepôts de « ${distributor.name} » pourront de nouveau recevoir des commandes, s'ils acceptent les commandes et sont correctement paramétrés (eBatPro, statut Prestashop).`,
        ...warnings,
      ].join('\n\n'),
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: closing ? 'Couper' : 'Ouvrir',
          style: closing ? 'destructive' : 'default',
          onPress: () => mutation.mutate(next),
        },
      ],
    );
  };

  return { request, isPending: mutation.isPending, trace: formatTrace(distributor.ordersAffectationUpdatedAt, distributor.ordersAffectationUpdatedBy) };
}

/** Pause de l'acceptation / du déploiement automatiques des propositions d'un distributeur. */
export function useNegoAutoDeployToggle(distributor: AdminDistributor) {
  const refresh = useRefreshPartners();
  const mutation = useMutation({
    mutationFn: (paused: boolean) => adminPartnersApi.setNegoAutoDeploy(distributor.id, paused),
    onSuccess: async (res) => {
      toast.success(
        res.negoAutoDeployPaused
          ? `Déploiement automatique mis en pause pour ${distributor.name}`
          : `Déploiement automatique réactivé pour ${distributor.name}`,
      );
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors du changement de pause du déploiement')),
  });

  const request = (paused: boolean) => {
    const pendingProposals = distributor.negoPendingProposals ?? 0;
    Alert.alert(
      paused ? 'Mettre le déploiement automatique en pause ?' : 'Réactiver le déploiement automatique ?',
      [
        paused
          ? `Les propositions de « ${distributor.name} » ne seront plus acceptées automatiquement (ni mises en standby), et ses produits acceptés ne seront plus lancés automatiquement. L'acceptation et le lancement manuels restent possibles.`
          : `Les propositions de « ${distributor.name} » seront de nouveau acceptées et lancées automatiquement, selon les règles habituelles.`,
        !paused && pendingProposals > 0
          ? `${pendingProposals} proposition${pendingProposals > 1 ? 's' : ''} en attente ${pendingProposals > 1 ? 'seront traitées' : 'sera traitée'} d'un coup (acceptation ou standby) au prochain passage automatique.`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: paused ? 'Mettre en pause' : 'Réactiver',
          style: paused ? 'destructive' : 'default',
          onPress: () => mutation.mutate(paused),
        },
      ],
    );
  };

  return { request, isPending: mutation.isPending, trace: formatTrace(distributor.negoAutoDeployPausedAt, distributor.negoAutoDeployPausedBy) };
}

/** Navigation commune vers la feuille de logo d'un distributeur ou d'une filiale. */
export function openLogoSheet(kind: 'distributor' | 'subsidiary', id: string) {
  router.push({ pathname: '/admin/partenaires/logo', params: { kind, id } });
}
