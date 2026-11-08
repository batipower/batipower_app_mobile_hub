import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  hubReturnsApi,
  type HubReturnLabel,
  type ReceiveReturnKind,
  type ReturnBrokenCause,
  type ReturnItemCondition,
  type ReturnPackagingCondition,
} from '@/api/hubReturns';

import { returnDetailKey } from '../queryKeys';

/**
 * Dernier lot de colis d'un retour : les étiquettes qui partagent le `batchUuid` de la plus récente,
 * triées par ordre de colis (une étiquette historique sans lot forme un lot à elle seule).
 */
export function latestReturnBatch(labels: HubReturnLabel[] | undefined): HubReturnLabel[] {
  if (!labels?.length) return [];
  const sorted = [...labels].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latest = sorted[0];
  if (!latest) return [];
  if (latest.batchUuid) {
    return labels
      .filter((label) => label.batchUuid === latest.batchUuid)
      .sort((a, b) => (a.parcelIndex ?? 1) - (b.parcelIndex ?? 1));
  }
  return [latest];
}

/**
 * Fiche d'un retour et état de réception dérivé. Le terme de la route (souvent un n° de suivi) peut
 * différer de la référence commande réellement résolue : toutes les actions visent
 * `actionReference` (la commande résolue), jamais le terme saisi.
 */
export function useReturnDetail(reference: string) {
  const query = useQuery({
    queryKey: returnDetailKey(reference),
    queryFn: ({ signal }) => hubReturnsApi.findByTerm(reference, signal),
    enabled: reference.length > 0,
    retry: false,
  });

  const detail = query.data?.data ?? null;
  const order = detail?.order ?? null;
  const returnLabels = useMemo(() => detail?.returnLabels ?? [], [detail?.returnLabels]);
  const marketplaceReturns = useMemo(
    () => detail?.marketplaceReturns ?? [],
    [detail?.marketplaceReturns],
  );
  const orderReference = order?.reference ?? null;
  const actionReference = orderReference ?? reference;

  const derived = useMemo(() => {
    const batch = latestReturnBatch(returnLabels);
    const relayLabel =
      returnLabels.find((label) => label.noSuivi?.startsWith('RPR-') && label.packageReceivedAndVerified) ??
      null;
    const verifiedLabel = returnLabels.find((label) => label.packageReceivedAndVerified) ?? null;
    const verifiedMarketplaceReturn =
      marketplaceReturns.find((entry) => entry.packageReceivedAndVerified) ?? null;

    const allBatchVerified = batch.length > 0 && batch.every((label) => label.packageReceivedAndVerified);
    const isReturnReceived = Boolean(
      relayLabel || allBatchVerified || (batch.length === 0 && verifiedMarketplaceReturn),
    );
    // Plus permissif : vrai dès qu'un colis ou un retour marketplace a été vérifié.
    const isAlreadyVerified = Boolean(verifiedLabel || verifiedMarketplaceReturn);
    const returnType: ReceiveReturnKind | null = relayLabel
      ? 'relay-point'
      : isReturnReceived
        ? 'standard'
        : null;

    // Source de l'état affiché : l'étiquette vérifiée, à défaut le retour marketplace vérifié.
    const stateSource = verifiedLabel ?? verifiedMarketplaceReturn;
    const receiptSource = relayLabel ?? stateSource;

    const nextLabelToReceive =
      batch.find((label) => !label.packageReceivedAndVerified) ?? batch[0] ?? null;

    return {
      batch,
      isReturnReceived,
      isAlreadyVerified,
      returnType,
      recordedCondition: (stateSource?.condition ?? null) as ReturnItemCondition | null,
      recordedBrokenCause: (stateSource?.brokenCause ?? null) as ReturnBrokenCause | null,
      recordedPackagingCondition: (stateSource?.packagingCondition ?? null) as ReturnPackagingCondition | null,
      verifiedDate: receiptSource?.dateVerified ?? null,
      verifiedByName: receiptSource?.verifiedByName ?? receiptSource?.verifiedByEmail ?? null,
      conditionMeta: {
        at: stateSource?.conditionAt ?? null,
        by: stateSource?.conditionByName ?? stateSource?.conditionByEmail ?? null,
      },
      packagingMeta: {
        at: stateSource?.packagingConditionAt ?? null,
        by: stateSource?.packagingConditionByName ?? stateSource?.packagingConditionByEmail ?? null,
      },
      nextLabelToReceive,
      /** Étiquette visée par une réception « standard » (la prochaine non vérifiée du dernier lot). */
      activeReturnLabelUuid: nextLabelToReceive?.uuid ?? null,
      /** Colis restant à réceptionner dans le lot (multi-colis). */
      pendingParcels: batch.filter((label) => !label.packageReceivedAndVerified).length,
      primaryMarketplaceReturn: marketplaceReturns[0] ?? null,
    };
  }, [returnLabels, marketplaceReturns]);

  return {
    query,
    order,
    orderReference,
    actionReference,
    returnLabels,
    marketplaceReturns,
    thumbnails: detail?.thumbnails ?? {},
    note: detail?.note ?? null,
    ...derived,
  };
}

export type ReturnDetailState = ReturnType<typeof useReturnDetail>;
