import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';

import { apiErrorCode } from '../lib/errors';
import type {
  EligibleReferentsResult,
  NegotiationCategoryType,
  PreviewItem,
} from '../lib/negotiation-api';
import { hasNoWeight, suggestCategoryFromCode, type NegotiationDialogItem } from '../lib/negotiation-items';

const PREVIEW_CHUNK = 200;

export type PreviewBundle = {
  previews: Map<string, PreviewItem>;
  overrides: Record<string, EligibleReferentsResult | null>;
  services: Record<string, NegotiationCategoryType>;
};

/**
 * Calcule, pour un sous-ensemble de produits, l'aperçu des référents (par lots) puis, pour ceux sans
 * référent, les référents du service suggéré par le code eBat. Retourne `null` si le chargement est
 * devenu obsolète (`isStale`).
 */
export async function loadPreviewsAndOverrides(
  subset: NegotiationDialogItem[],
  cache: Map<string, EligibleReferentsResult>,
  isStale: () => boolean,
): Promise<PreviewBundle | null> {
  const withWarehouse = subset.filter((it) => !!it.warehouse && !hasNoWeight(it));
  const previews = new Map<string, PreviewItem>();
  for (let i = 0; i < withWarehouse.length; i += PREVIEW_CHUNK) {
    if (isStale()) return null;
    const slice = withWarehouse.slice(i, i + PREVIEW_CHUNK);
    try {
      const preview = await hubProductAnalyzerApi.previewNegotiation(slice.map((it) => it.stagingUuid));
      for (const p of preview) previews.set(p.stagingUuid, p);
    } catch (e: unknown) {
      if (apiErrorCode(e) === 'STAGING_WITHOUT_WAREHOUSE') {
        const retry = slice.filter((it) => !!it.warehouse);
        if (retry.length > 0 && retry.length < slice.length) {
          const preview = await hubProductAnalyzerApi.previewNegotiation(retry.map((it) => it.stagingUuid));
          for (const p of preview) previews.set(p.stagingUuid, p);
        }
      } else {
        throw e;
      }
    }
  }
  if (isStale()) return null;

  const overrides: Record<string, EligibleReferentsResult | null> = {};
  const services: Record<string, NegotiationCategoryType> = {};
  for (const it of subset) {
    if (hasNoWeight(it)) continue;
    const p = previews.get(it.stagingUuid);
    // Service détecté automatiquement (avec ou sans référent inscrit) : jamais écrasé par la suggestion.
    if (!p || p.categoryTypes.length > 0 || p.referents.length > 0) continue;
    const suggested = suggestCategoryFromCode(it.codeEbat);
    if (!suggested) continue;
    const key = `${p.warehouse}|${suggested.category}`;
    let cached = cache.get(key);
    if (!cached) {
      cached = await hubProductAnalyzerApi.eligibleReferents(p.warehouse, suggested.category);
      cache.set(key, cached);
    }
    overrides[it.stagingUuid] = cached;
    if (cached.referents.length > 0) services[it.stagingUuid] = suggested.category;
  }
  if (isStale()) return null;
  return { previews, overrides, services };
}
