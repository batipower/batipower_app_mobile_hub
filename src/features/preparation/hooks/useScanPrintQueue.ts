import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { preparationApi } from '@/api/preparation';
import type { PreparationOrder } from '@/types/preparation';

import { SCAN_DEBOUNCE_MS, SCAN_HISTORY_LIMIT, WH_KEY } from '../constants';
import { getNbColis, recipientName } from '../orderHelpers';

export type ScanJobStatus = 'processing' | 'success' | 'error';

export interface ScanJob {
  id: string;
  reference: string;
  status: ScanJobStatus;
  /** Message principal (« Étiquette envoyée », « Référence inconnue »…). */
  message: string;
  /** Client et nombre de colis, ou la raison d'un refus. */
  detail?: string;
  /** Une réimpression volontaire est proposée (commande connue, envoi terminé). */
  canReprint: boolean;
}

interface QueueItem {
  id: string;
  order: PreparationOrder;
}

let seq = 0;
const nextId = () => `scan-${(seq += 1)}`;

/** Message d'erreur lisible pour l'opérateur, sans jargon réseau. */
function failureDetail(error: unknown): string {
  if (error && typeof error === 'object' && 'isNetworkError' in error && error.isNetworkError) {
    return 'Pas de connexion, réessayez';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Vérifiez la connexion et réessayez';
}

/**
 * File d'impression pilotée par le scan caméra. Port simplifié de `useOrderScan.ts` (web) :
 * recherche par référence ou `ebatRef`, un seul envoi à la fois dans l'ordre de lecture, et
 * refus (sans appel serveur) des références inconnues de la liste « À préparer ».
 *
 * Côté caméra, un même code est lu plusieurs fois par seconde : la même valeur est ignorée
 * pendant `SCAN_DEBOUNCE_MS`, et une référence déjà envoyée pendant la session est refusée
 * (réimpression possible via `reprint`).
 */
export function useScanPrintQueue(orders: PreparationOrder[]) {
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [sentCount, setSentCount] = useState(0);

  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const ordersByKey = useMemo(() => {
    const byKey = new Map<string, PreparationOrder>();
    for (const order of orders) {
      for (const key of [order.reference, order.ebatRef]) {
        const normalized = key?.trim().toUpperCase();
        if (normalized && !byKey.has(normalized)) byKey.set(normalized, order);
      }
    }
    return byKey;
  }, [orders]);
  const indexRef = useRef(ordersByKey);
  useEffect(() => {
    indexRef.current = ordersByKey;
  }, [ordersByKey]);

  const queueRef = useRef<QueueItem[]>([]);
  const runningRef = useRef(false);
  /** Commandes envoyées pendant la session (elles peuvent quitter la liste au rafraîchissement). */
  const sentRef = useRef(new Map<string, PreparationOrder>());
  /** Références en file ou en cours d'envoi. */
  const inFlightRef = useRef(new Set<string>());
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);

  const upsert = useCallback((job: ScanJob) => {
    setJobs((current) => {
      const exists = current.some((item) => item.id === job.id);
      const next = exists
        ? current.map((item) => (item.id === job.id ? job : item))
        : [job, ...current];
      return next.slice(0, SCAN_HISTORY_LIMIT);
    });
  }, []);

  const pump = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      let item = queueRef.current.shift();
      while (item) {
        const { id, order } = item;
        const nbColis = getNbColis(order);
        const detail = `${recipientName(order.deliveryAddress)} · ${nbColis} colis`;
        upsert({
          id,
          reference: order.reference,
          status: 'processing',
          message: `Envoi de ${order.reference}…`,
          detail,
          canReprint: false,
        });
        try {
          await preparationApi.updateOrigin(order.reference, WH_KEY);
          await preparationApi.generateLabel(order.reference, nbColis);
          sentRef.current.set(order.reference, order);
          setSentCount((count) => count + 1);
          upsert({
            id,
            reference: order.reference,
            status: 'success',
            message: `Étiquette envoyée — ${order.reference}`,
            detail,
            canReprint: true,
          });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          upsert({
            id,
            reference: order.reference,
            status: 'error',
            message: `Échec — ${order.reference}`,
            detail: failureDetail(error),
            canReprint: true,
          });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        inFlightRef.current.delete(order.reference);
        item = queueRef.current.shift();
      }
    } finally {
      runningRef.current = false;
    }
  }, [upsert]);

  const enqueue = useCallback(
    (order: PreparationOrder) => {
      if (inFlightRef.current.has(order.reference)) return;
      inFlightRef.current.add(order.reference);
      queueRef.current.push({ id: nextId(), order });
      void pump();
    },
    [pump],
  );

  const refuse = useCallback(
    (reference: string, message: string, detail: string) => {
      upsert({ id: nextId(), reference, status: 'error', message, detail, canReprint: false });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    [upsert],
  );

  /** À brancher sur `onBarcodeScanned` de la caméra. */
  const onScan = useCallback(
    (rawValue: string) => {
      const value = rawValue.trim().toUpperCase();
      if (!value) return;

      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.value === value && now - last.at < SCAN_DEBOUNCE_MS) return;
      lastScanRef.current = { value, at: now };

      const order = indexRef.current.get(value) ?? sentRef.current.get(value);
      if (!order) {
        refuse(
          value,
          `Référence inconnue : ${value}`,
          'Absente de la liste À préparer, rien envoyé',
        );
        return;
      }

      if (inFlightRef.current.has(order.reference) || sentRef.current.has(order.reference)) {
        refuse(
          order.reference,
          `Déjà envoyée — ${order.reference}`,
          'Utilisez Réimprimer pour la renvoyer',
        );
        return;
      }

      enqueue(order);
    },
    [enqueue, refuse],
  );

  /** Renvoie volontairement l'étiquette d'une commande déjà envoyée (ou en échec). */
  const reprint = useCallback(
    (reference: string) => {
      const order =
        ordersRef.current.find((item) => item.reference === reference) ??
        sentRef.current.get(reference);
      if (!order) {
        refuse(
          reference,
          `Commande introuvable — ${reference}`,
          'Elle a peut-être déjà été traitée',
        );
        return;
      }
      enqueue(order);
    },
    [enqueue, refuse],
  );

  return { jobs, sentCount, onScan, reprint };
}
