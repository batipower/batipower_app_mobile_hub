import { apiClient } from '@/api/client';
import type { HubDeployment } from '@/types/hubDeployment';

/**
 * Page « Déploiement » du HUB (`hub-app/deployments/*`). Le back réserve cette route au
 * SUPERADMIN : l'app ne l'appelle que pour ce rôle.
 */
export const hubDeploymentsApi = {
  get(reference: string, signal?: AbortSignal) {
    return apiClient.get<HubDeployment>(`hub-app/deployments/${encodeURIComponent(reference)}`, {
      signal,
    });
  },
};
