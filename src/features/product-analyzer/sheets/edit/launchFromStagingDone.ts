import type { QueryClient } from '@tanstack/react-query';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';

import { refreshAnalyzerData } from '../../bulkActions';
import { patchStagingInCache } from '../../lib/cache';

/** Après « Créer depuis l'analyse » : produit marqué lancé, opportunité d'origine soldée, caches rafraîchis. */
export async function launchFromStagingDone(
  queryClient: QueryClient,
  uuid: string,
  batipowerId: number | null,
  opportunityUuid?: string,
): Promise<void> {
  patchStagingInCache(queryClient, uuid, { status: 'LAUNCHED', ...(batipowerId != null ? { batipowerId } : {}) });
  if (opportunityUuid) {
    await hubProductAnalyzerApi
      .markLaunched(opportunityUuid, batipowerId != null ? { batipowerId } : {})
      .catch(() => undefined);
  }
  refreshAnalyzerData();
}
