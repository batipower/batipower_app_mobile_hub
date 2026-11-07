import { apiClient } from '@/api/client';
import type {
  HubCaMonthView,
  HubDashboardOverview,
  HubDayOrders,
  SupportResponseTimes,
} from '@/types/hubDashboard';
import type { WebsiteDashboardPeriod, WebsiteDashboardReport } from '@/types/hubWebsiteDashboard';

type ReadOptions = { signal?: AbortSignal };

/**
 * Cockpit du module HUB (`hub-app/dashboard/*`), en lecture seule. Pendant mobile de
 * `front_externe_batipower/lib/api/hub-dashboard.ts` : sans le recalcul des marges ni les
 * prix d'achat actuels, réservés au web.
 */
export const hubDashboardApi = {
  overview({ signal }: ReadOptions = {}) {
    return apiClient.get<HubDashboardOverview>('hub-app/dashboard/overview', { signal });
  },

  /** CA HT et marge brute HT jour par jour d'un mois civil (`YYYY-MM`), SUPERADMIN. */
  caMonth(month: string, { signal }: ReadOptions = {}) {
    return apiClient.get<HubCaMonthView>('hub-app/dashboard/ca-month', {
      query: { month },
      signal,
    });
  },

  /** Commandes réalisées d'un jour (`YYYY-MM-DD`, Europe/Paris), avec leur marge ; SUPERADMIN. */
  dayOrders(date: string, origins: readonly string[] = [], { signal }: ReadOptions = {}) {
    return apiClient.get<HubDayOrders>('hub-app/dashboard/orders', {
      query: { date, origins: origins.length > 0 ? origins.join(',') : undefined },
      signal,
    });
  },

  /**
   * Vue « Site » : notes des fiches, ruptures, déploiement par service et palmarès des produits
   * vendus uniquement sur le site, sur `30d` | `90d` | `12m` ; SUPERADMIN.
   */
  website(period: WebsiteDashboardPeriod, { signal }: ReadOptions = {}) {
    return apiClient.get<WebsiteDashboardReport>('hub-app/dashboard/website', {
      query: { period },
      signal,
    });
  },

  /** Délai de réponse du support du site internet, global et par opérateur ; SUPERADMIN. */
  supportResponseTimes(days: number, { signal }: ReadOptions = {}) {
    return apiClient.get<SupportResponseTimes>('support-chat/staff/stats/response-times', {
      query: { days },
      signal,
    });
  },
};
