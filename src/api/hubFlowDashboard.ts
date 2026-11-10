import { apiClient } from '@/api/client';
import type { FlowDashboardCountryCode, FlowDashboardSimpleResponse } from '@/types/flowDashboard';

/**
 * Dashboard flux, vue simplifiée (`logistics-app/orders/flow-dashboard/simple`, SUPERADMIN et RAF),
 * en lecture seule. Pendant mobile de `ordersApi.flowDashboardSimple` du front web.
 */
export const flowDashboardApi = {
  /** `months` = `YYYY-MM,YYYY-MM` (année en cours), `country` = codes pays séparés par des virgules. */
  simple(
    params: { months?: string; country?: FlowDashboardCountryCode | string },
    options: { signal?: AbortSignal } = {},
  ) {
    return apiClient.get<FlowDashboardSimpleResponse>('logistics-app/orders/flow-dashboard/simple', {
      query: params,
      signal: options.signal,
    });
  },
};
