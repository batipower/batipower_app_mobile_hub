import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { hubOrdersApi } from '@/api/hubOrders';
import { hubReturnsApi } from '@/api/hubReturns';
import { errorMessage } from '@/features/preparation/components/ListState';
import { openBase64Pdf } from '@/lib/base64File';
import type { HubLogisticsDetail } from '@/types/order';
import type {
  CreateCancellationBody,
  GenerateLabelInput,
  HubResendOrderBody,
  HubSplitManualBody,
  RefundOrderBody,
} from '@/types/orderActions';

import { orderDetailKey } from '../hooks/useOrderDetail';
import type { DeliveryNoteFormat } from './deliveryNote/deliveryNoteHtml';
import { printDeliveryNote } from './deliveryNote/printDeliveryNote';
import {
  URGENT_TAG,
  isRefundedPaymentStatus,
  isResendReference,
  isUrgentOrder,
} from './orderActionRules';

export type OrderDetailData = NonNullable<HubLogisticsDetail['data']>;

/** Valeur de retour de `useOrderActions`, transmise aux feuilles. */
export type OrderActions = ReturnType<typeof useOrderActions>;

/** Feuilles de saisie de la fiche commande (une seule ouverte à la fois). */
export type OrderSheetKind =
  | 'label'
  | 'transfer'
  | 'resend'
  | 'split'
  | 'cancel'
  | 'refund'
  | 'deliveryNote'
  | 'creditSlips';

const LABEL_PDF_POLL_INTERVAL_MS = 2_000;
const LABEL_PDF_POLL_TIMEOUT_MS = 60_000;

function confirm(
  title: string,
  message: string,
  label: string,
  destructive: boolean,
  onConfirm: () => void,
) {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: label, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/**
 * Actions de la barre de la fiche commande : mêmes appels que `useHubOrderDetail` côté web. Le
 * back répond 200 avec `success: false` pour un refus métier : chaque mutation le lit et l'affiche
 * en erreur. Chaque succès recharge la fiche.
 */
export function useOrderActions(data: OrderDetailData, routeReference: string) {
  const queryClient = useQueryClient();
  const { order } = data;
  const reference = order.reference;
  const [sheet, setSheet] = useState<OrderSheetKind | null>(null);
  const labelPdfAbort = useRef<AbortController | null>(null);
  const closeSheet = useCallback(() => {
    // Fermer la feuille (par quelque moyen que ce soit) arrête l'attente de l'étiquette PDF.
    labelPdfAbort.current?.abort();
    setSheet(null);
  }, []);

  const reload = useCallback(async () => {
    const keys = new Set([routeReference, reference]);
    await Promise.all(
      [...keys].map((key) => queryClient.invalidateQueries({ queryKey: orderDetailKey(key) })),
    );
  }, [queryClient, routeReference, reference]);

  const notifySuccess = () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

  // ── Urgence (tag de l'entrepôt) ──────────────────────────────────────────
  const isUrgent = isUrgentOrder(order);
  const urgentMutation = useMutation({
    mutationFn: () => {
      const current = order.warehouseOrder?.tags ?? [];
      const next = isUrgent ? current.filter((tag) => tag !== URGENT_TAG) : [...current, URGENT_TAG];
      return hubOrdersApi.updateTags(reference, next);
    },
    onSuccess: async () => {
      toast.success(isUrgent ? 'Urgence retirée' : 'Commande passée en urgence');
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, "Changement d'urgence impossible")),
  });

  // ── Passer sur eBatPro ───────────────────────────────────────────────────
  const ebatMutation = useMutation({
    mutationFn: () => {
      const uuid = order.warehouseOrder?.uuid;
      if (!uuid) throw new Error('Entrepôt de commande introuvable');
      return hubOrdersApi.resendOrder(uuid);
    },
    onSuccess: async (res) => {
      if (res.success === false) {
        toast.error(res.message || 'Renvoi sur eBatPro refusé');
        return;
      }
      toast.success('Commande renvoyée en traitement');
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, 'Renvoi sur eBatPro impossible')),
  });

  // ── Fusion d'un split ────────────────────────────────────────────────────
  const mergeMutation = useMutation({
    mutationFn: () => hubOrdersApi.mergeSplit(reference),
    onSuccess: async (res) => {
      if (res.success === false) {
        toast.error(res.message || 'Fusion impossible');
        return;
      }
      toast.success(res.message || 'Split fusionné');
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, 'Fusion du split impossible')),
  });

  // ── Rétracter une demande d'annulation ───────────────────────────────────
  const retractMutation = useMutation({
    mutationFn: (id: string) => hubOrdersApi.cancelCancellationRequest(id),
    onSuccess: async () => {
      toast.success("Demande d'annulation retirée");
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, 'Retrait de la demande impossible')),
  });

  // ── Passer en Livré (SUPERADMIN) ─────────────────────────────────────────
  const deliveredMutation = useMutation({
    mutationFn: () => hubOrdersApi.markDelivered(reference),
    onSuccess: async (res) => {
      if (!res.success) {
        toast.error(res.message || 'Passage en Livré impossible');
        return;
      }
      notifySuccess();
      toast.success(res.message || 'Commande passée en Livré');
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, 'Passage en Livré impossible')),
  });

  // ── Transfert d'entrepôt ─────────────────────────────────────────────────
  const transferMutation = useMutation({
    mutationFn: ({ warehouse, force }: { warehouse: string; force?: boolean }) =>
      hubOrdersApi.transferWarehouse(reference, warehouse, force),
    onSuccess: async (res) => {
      if (res.success === false) {
        toast.error(res.message || 'Transfert refusé');
        return;
      }
      notifySuccess();
      toast.success(res.message || 'Commande transférée');
      closeSheet();
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, "Transfert d'entrepôt impossible")),
  });

  // ── Renvoi au client ─────────────────────────────────────────────────────
  const resendMutation = useMutation({
    mutationFn: (body: HubResendOrderBody) => hubOrdersApi.resendToCustomer(reference, body),
    onSuccess: async (res) => {
      if (!res.success) {
        toast.error(res.message || 'Création du renvoi impossible');
        await reload();
        return;
      }
      notifySuccess();
      toast.success(res.newOrderId ? `Renvoi créé : ${res.newOrderId}` : res.message || 'Renvoi créé');
      closeSheet();
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, 'Renvoi au client impossible')),
  });

  // ── Split ────────────────────────────────────────────────────────────────
  const splitMutation = useMutation({
    mutationFn: (body: HubSplitManualBody) => hubOrdersApi.splitManual(body),
    onSuccess: async (res) => {
      if (res.success === false) {
        toast.error(res.message || 'Split impossible');
        return;
      }
      notifySuccess();
      toast.success(res.message || 'Commande splittée');
      closeSheet();
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, 'Split de la commande impossible')),
  });

  // ── Annulation ───────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: (body: Omit<CreateCancellationBody, 'orderReference'>) =>
      hubOrdersApi.createCancellationRequest({ orderReference: reference, ...body }),
    onSuccess: async (request) => {
      if (request?.status === 'APPROVED') {
        // Validation immédiate (QG) : on annonce aussi l'issue du remboursement PrestaShop.
        if (request.autoRefundOutcome === 'REFUNDED') {
          toast.success('Annulation validée, client remboursé sur PrestaShop');
        } else if (request.autoRefundOutcome === 'FAILED') {
          toast.warning(
            `Annulation validée, mais le remboursement automatique a échoué${request.refundError ? ` : ${request.refundError}` : ''}. Utilisez « Rembourser ».`,
          );
        } else if (request.autoRefundOutcome === 'SKIPPED_TRANSFER') {
          toast.warning(
            'Annulation validée, remboursement automatique non effectué (commande transférée). Utilisez « Rembourser ».',
          );
        } else if (isResendReference(reference)) {
          toast.success('Renvoi annulé (statut « Annulé », aucun remboursement)');
        } else {
          toast.success('Annulation validée (aucun remboursement automatique)');
        }
      } else {
        toast.success("Demande d'annulation créée");
      }
      notifySuccess();
      closeSheet();
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, "Demande d'annulation impossible")),
  });

  // ── Remboursement (même endpoint que « Gérer retour ») ───────────────────
  const refundMutation = useMutation({
    mutationFn: (body: RefundOrderBody) => hubReturnsApi.refund(reference, body),
    onSuccess: async (res) => {
      if (!res.success) {
        toast.error(res.message || "Création de l'avoir impossible");
        return;
      }
      const amount = res.amount ? ` (${res.amount.toFixed(2)} €)` : '';
      notifySuccess();
      toast.success(`Avoir ${res.isPartial ? 'partiel ' : ''}créé${amount}`);
      closeSheet();
      // Le bouton « Avoir » doit apparaître (ou lister le nouvel avoir) juste après.
      await Promise.all([
        reload(),
        queryClient.invalidateQueries({ queryKey: ['hub-order-credit-slips', reference] }),
      ]);
    },
    onError: (error) => toast.error(errorMessage(error, 'Remboursement impossible')),
  });

  // ── Étiquette (thermique, ou PDF de secours en attente du fichier) ───────
  const labelMutation = useMutation({
    mutationFn: (input: Omit<GenerateLabelInput, 'referenceOrder'>) =>
      hubOrdersApi.generateLabel({ referenceOrder: reference, ...input }),
    onSuccess: async (_result, variables) => {
      if (variables.printMode === 'PDF') {
        // Génération asynchrone : on attend le PDF avant de fermer la feuille.
        labelPdfMutation.mutate();
        return;
      }
      notifySuccess();
      toast.success('Étiquette générée');
      closeSheet();
      await reload();
      void queryClient.invalidateQueries({ queryKey: ['hub-order-label-carriers', reference] });
    },
    onError: (error) => toast.error(errorMessage(error, "Génération de l'étiquette impossible")),
  });

  /**
   * Attend le PDF de secours (sondage toutes les 2 s, 60 s au plus). Fermer la feuille interrompt
   * l'attente : `closeSheet` annule le contrôleur.
   */
  const labelPdfMutation = useMutation({
    mutationFn: async (): Promise<string | null> => {
      const controller = new AbortController();
      labelPdfAbort.current = controller;
      const startedAt = Date.now();
      try {
        while (!controller.signal.aborted) {
          const result = await hubOrdersApi.getLabelPdf(reference, controller.signal);
          if (result.status === 'READY' && result.base64Pdf) return result.base64Pdf;
          if (result.status === 'ERROR') {
            throw new Error(result.message || "Échec de la génération de l'étiquette PDF");
          }
          if (Date.now() - startedAt >= LABEL_PDF_POLL_TIMEOUT_MS) {
            throw new Error(
              "Délai dépassé : l'étiquette n'est pas encore prête. La génération peut continuer en arrière-plan : ne relancez pas tout de suite.",
            );
          }
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, LABEL_PDF_POLL_INTERVAL_MS);
            controller.signal.addEventListener('abort', () => {
              clearTimeout(timer);
              resolve();
            });
          });
        }
        return null;
      } catch (error) {
        // Feuille fermée pendant l'attente : rien à signaler.
        if (controller.signal.aborted) return null;
        throw error;
      }
    },
    onSuccess: async (base64Pdf) => {
      if (!base64Pdf) return;
      closeSheet();
      toast.success('Étiquette PDF générée');
      notifySuccess();
      await openBase64Pdf(base64Pdf, `etiquette-${reference}.pdf`, `Étiquette ${reference}`);
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, "Impossible de récupérer l'étiquette PDF")),
  });

  // ── Documents : facture, avoirs, bon de livraison ────────────────────────
  const invoiceMutation = useMutation({
    mutationFn: () => hubOrdersApi.getInvoice(reference),
    onSuccess: async (res) => {
      if (!res.success || !res.base64) {
        toast.error(res.message || 'Facture indisponible');
        return;
      }
      toast.success(res.invoiceNumber ? `Facture ${res.invoiceNumber} prête` : 'Facture prête');
      notifySuccess();
      await openBase64Pdf(
        res.base64,
        res.filename || `facture-${reference}.pdf`,
        res.invoiceNumber ? `Facture ${res.invoiceNumber}` : `Facture ${reference}`,
      );
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, 'Téléchargement de la facture impossible')),
  });

  // Requête limitée aux commandes remboursées : évite un appel PrestaShop sur chaque fiche.
  const isRefunded = isRefundedPaymentStatus(order.paymentStatus);
  const creditSlipsQuery = useQuery({
    queryKey: ['hub-order-credit-slips', reference],
    queryFn: ({ signal }) => hubOrdersApi.listCreditSlips(reference, signal),
    enabled: isRefunded,
    retry: false,
  });
  const creditSlips = creditSlipsQuery.data?.success ? (creditSlipsQuery.data.slips ?? []) : [];

  const creditSlipMutation = useMutation({
    mutationFn: (slipId: number) => hubOrdersApi.getCreditSlip(reference, slipId),
    onSuccess: async (res, slipId) => {
      if (!res.success || !res.base64) {
        toast.error(res.message || 'Avoir indisponible');
        return;
      }
      closeSheet();
      notifySuccess();
      await openBase64Pdf(res.base64, res.filename || `avoir-${reference}-${slipId}.pdf`, `Avoir ${slipId}`);
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, "Téléchargement de l'avoir impossible")),
  });

  const deliveryNoteMutation = useMutation({
    mutationFn: (format: DeliveryNoteFormat) => printDeliveryNote(order, format),
    onSuccess: async () => {
      await reload();
    },
    onError: (error) => toast.error(errorMessage(error, "Impression du bon de livraison impossible")),
  });

  /** Avoir : un seul → téléchargement direct ; plusieurs → feuille de choix. */
  const openCreditSlips = () => {
    if (creditSlips.length === 1 && creditSlips[0]) {
      creditSlipMutation.mutate(creditSlips[0].slipId);
    } else {
      setSheet('creditSlips');
    }
  };

  // ── Confirmations natives ────────────────────────────────────────────────
  const confirmEbat = () =>
    confirm(
      'Passer sur eBatPro',
      `Remet l'entrepôt de ${reference} en « À traiter » pour que eBatPro retraite la commande.`,
      'Renvoyer',
      false,
      () => ebatMutation.mutate(),
    );

  const confirmMerge = () =>
    confirm(
      'Fusionner le split',
      `Réunit les commandes issues du split de ${reference}.`,
      'Fusionner',
      true,
      () => mergeMutation.mutate(),
    );

  const confirmRetract = (requestId: string) =>
    confirm(
      "Rétracter l'annulation",
      "Annule la demande d'annulation en cours : la commande reste active.",
      'Rétracter',
      false,
      () => retractMutation.mutate(requestId),
    );

  const confirmDelivered = () =>
    confirm(
      'Passer en Livré',
      'Force le statut Livré sur PrestaShop et sur la commande. À réserver aux commandes sans suivi transporteur, par exemple celles issues d’un devis.',
      'Passer en Livré',
      false,
      () => deliveredMutation.mutate(),
    );

  return {
    sheet,
    openSheet: setSheet,
    closeSheet,
    isUrgent,
    urgentMutation,
    ebatMutation,
    mergeMutation,
    retractMutation,
    deliveredMutation,
    transferMutation,
    resendMutation,
    splitMutation,
    cancelMutation,
    refundMutation,
    labelMutation,
    invoiceMutation,
    creditSlipMutation,
    deliveryNoteMutation,
    /** Avoirs PDF de la commande (vide tant qu'elle n'est pas remboursée). */
    creditSlips,
    creditSlipsLoading: isRefunded && creditSlipsQuery.isPending,
    openCreditSlips,
    /** Une étiquette PDF a été demandée : la feuille attend le fichier. */
    waitingLabelPdf: labelPdfMutation.isPending,
    confirmEbat,
    confirmMerge,
    confirmRetract,
    confirmDelivered,
    reload,
  };
}
