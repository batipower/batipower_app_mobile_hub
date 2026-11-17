import { apiClient } from '@/api/client';
import type { StudioBulkOutcome, StudioEstimateResponse } from '@/types/hubStudioJobs';

type Options = { signal?: AbortSignal };

/**
 * File d'attente du Product Studio (`hub-app/product-studio/*`), sous-ensemble utilisé par le
 * lancement groupé depuis Pricing. Plafond serveur : 500 références par envoi.
 */
export const hubProductStudioJobsApi = {
  /** Note actuelle et note estimée (sans IA) d'une sélection, avec alertes de publication. */
  estimate(references: string[], { signal }: Options = {}) {
    return apiClient.post<StudioEstimateResponse>(
      'hub-app/product-studio/estimate',
      { references },
      { signal },
    );
  },

  /**
   * Prépare plusieurs fiches d'un coup. `autoDeploy` (SUPERADMIN) publie ensuite automatiquement
   * les fiches dont le contrôle préalable est « prête ».
   */
  prepareBulk(references: string[], options: { autoDeploy?: boolean } = {}) {
    return apiClient.post<StudioBulkOutcome>('hub-app/product-studio/jobs/prepare-bulk', {
      references,
      ...(options.autoDeploy ? { autoDeploy: true } : {}),
    });
  },
};
