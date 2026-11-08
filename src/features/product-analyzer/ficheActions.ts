import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import { queryClient } from '@/api/queryClient';
import type { StagingItem } from '@/types/hubProductAnalyzer';

import { confirmDialog, refreshAnalyzerData, reportBulk } from './bulkActions';
import { patchStagingInCache } from './lib/cache';
import { apiErrorMessage } from './lib/errors';
import { stagingRerunTarget } from './lib/helpers';
import { readSkipWeight } from './lib/preferences';
import type { AnalyzeRequest } from './socket/types';

/** Actions d'une fiche produit (lancer, drapeaux, relance…), hors composants pour être appelables depuis une feuille. */

const itemLabel = (item: StagingItem) => item.designation || item.codeEbat || item.ean || item.uuid;

const successHaptic = () =>
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

export type FicheLaunchMode = 'launch' | 'deploy';

/** Ce que la barre d'actions propose comme action principale. */
export type FichePrimary =
  | { kind: 'none'; reason: string | null }
  | { kind: 'attach-ean' }
  | { kind: 'launch' }
  | { kind: 'link-deploy' }
  | { kind: 'create-from-analysis' }
  | { kind: 'marketplaces' };

/**
 * Détermine l'action principale d'une fiche, avec les mêmes règles que le web :
 * ligne de trace verrouillée, EAN à attacher, produit déjà au catalogue (lier + déployer),
 * création depuis l'analyse (EAN direct sans référence) ou lancement classique.
 */
export function ficheLaunchState(item: StagingItem): FichePrimary {
  if (item.forcedFromCatalogue) return { kind: 'none', reason: 'Ligne de trace — verrouillée' };
  if (item.status === 'LAUNCHED') return { kind: 'marketplaces' };
  if (item.status === 'EBAT_NOT_FOUND') return { kind: 'attach-ean' };
  const blocked = item.tooFragile || item.tooVoluminous;
  if (item.inCatalogue) {
    return blocked ? { kind: 'none', reason: 'Déploiement bloqué (fragile / volumineux)' } : { kind: 'link-deploy' };
  }
  const eb = item.fullAnalysisSnapshot?.ebatpro as Record<string, unknown> | undefined;
  const hasEan = !!(item.ean || (typeof eb?.ean === 'string' && eb.ean && eb.ean !== '-'));
  const ebatReady =
    !!item.codeEbat &&
    !!eb &&
    (eb.found === true || eb.purchasePriceHT != null || eb.stockTotal != null || eb.saleUnit != null || !!eb.sku);
  if (item.sourceMode === 'EAN_DIRECT') {
    if (!hasEan && !ebatReady) return { kind: 'create-from-analysis' };
    return blocked ? { kind: 'none', reason: 'Lancement bloqué (fragile / volumineux)' } : { kind: 'launch' };
  }
  return blocked ? { kind: 'none', reason: 'Lancement bloqué (fragile / volumineux)' } : { kind: 'launch' };
}

/**
 * Lance (ou lance + déploie sur les marketplaces) un produit. Marque l'opportunité d'origine comme
 * « lancée » si l'analyse en venait. Retourne `true` en cas de succès.
 */
export async function launchSingle(
  item: StagingItem,
  mode: FicheLaunchMode,
  opportunityUuid?: string | null,
): Promise<boolean> {
  const label = itemLabel(item);
  try {
    let batipowerId: number | null = null;
    if (mode === 'launch') {
      const res = await hubProductAnalyzerApi.launch(item.uuid);
      if (res?.success === false) {
        reportBulk('error', [`Lancement échoué : ${res.message || label}`]);
        return false;
      }
      batipowerId = res?.batipowerId ?? null;
      reportBulk('success', [res?.adopted ? 'Produit lié au catalogue' : 'Produit lancé']);
    } else {
      const data = await hubProductAnalyzerApi.launchAndDeploy(item.uuid);
      if (data.launch?.success === false) {
        reportBulk('error', [`Lancement échoué : ${data.launch.message || label}`]);
        return false;
      }
      batipowerId = data.launch?.batipowerId ?? null;
      const lines: string[] = [];
      let errors = 0;
      for (const [mp, result] of Object.entries(data.deploy ?? {})) {
        if (result.status === 'success') lines.push(`${mp} : offre créée${result.priceTTC ? ` à ${result.priceTTC} €` : ''}`);
        else if (result.status === 'error') {
          errors += 1;
          lines.push(`${mp} : ${result.error || 'erreur'}`);
        }
      }
      if (data.note) lines.push(data.note);
      reportBulk(errors > 0 ? 'error' : 'success', [
        errors > 0 ? 'Lancé, déploiement partiel' : 'Lancé et déployé',
        ...lines,
      ]);
    }
    if (opportunityUuid) {
      void hubProductAnalyzerApi
        .markLaunched(opportunityUuid, batipowerId != null ? { batipowerId } : {})
        .catch(() => undefined);
    }
    patchStagingInCache(queryClient, item.uuid, {
      status: 'LAUNCHED',
      ...(batipowerId != null ? { batipowerId } : {}),
    });
    refreshAnalyzerData();
    return true;
  } catch (err) {
    reportBulk('error', [`Lancement échoué : ${apiErrorMessage(err, 'erreur réseau')}`]);
    return false;
  }
}

/** Bascule « Fragile » / « Volumineux » (bloque le lancement), avec retour arrière si l'API échoue. */
export async function toggleFlag(item: StagingItem, flag: 'tooFragile' | 'tooVoluminous'): Promise<void> {
  const next = !item[flag];
  const rollback = patchStagingInCache(queryClient, item.uuid, { [flag]: next });
  try {
    if (flag === 'tooFragile') await hubProductAnalyzerApi.updateFragile(item.uuid, next);
    else await hubProductAnalyzerApi.updateVoluminous(item.uuid, next);
    void Haptics.selectionAsync().catch(() => undefined);
    refreshAnalyzerData();
  } catch (err) {
    rollback();
    toast.error(apiErrorMessage(err, 'Modification impossible'));
  }
}

/** Recalcule les degrés de viabilité TOP 1–7 du produit. */
export async function recalculateTop(item: StagingItem): Promise<void> {
  const loading = toast.loading('Recalcul TOP 1–7…');
  try {
    await hubProductAnalyzerApi.recalculateViabilityTop(item.uuid);
    toast.success('TOP 1–7 recalculé', { id: loading });
    successHaptic();
    refreshAnalyzerData();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Recalcul impossible'), { id: loading });
  }
}

/** Demande d'analyse qui relance un produit existant (par code eBat, sinon par EAN) ; `null` si non relançable. */
export async function buildRerunRequest(item: StagingItem): Promise<AnalyzeRequest | null> {
  const target = stagingRerunTarget(item);
  if (!target) return null;
  const skipWeight = await readSkipWeight();
  const label = item.designation || target.code;
  if (target.refType === 'ebatpro') {
    return {
      label,
      skipWeight,
      start: {
        type: 'ebat',
        payload: {
          codeEbat: target.code,
          ...(target.distributorId ? { distributorId: target.distributorId } : target.warehouse ? { warehouse: target.warehouse } : {}),
          forceReanalyze: true,
        },
      },
    };
  }
  return {
    label,
    skipWeight,
    start: {
      type: 'ean',
      payload: {
        ean: target.code,
        stagingId: item.uuid,
        ...(target.distributorId ? { distributorId: target.distributorId } : target.warehouse ? { warehouse: target.warehouse } : {}),
        forceReanalyze: true,
      },
    },
  };
}

export { confirmDialog };
