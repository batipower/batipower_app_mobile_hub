import { apiClient } from '@/api/client';
import type { HubBrandMarginDetail, HubBrandMarginOverview } from '@/types/hubBrandMargin';

/**
 * Marge par marque du HUB (`hub-app/brand-margin*`), SUPERADMIN. Contrat repris de
 * `front_externe_batipower/lib/api/hub-brand-margin.ts`. La période est limitée à 366 jours par l'API.
 */

export interface HubBrandMarginPeriod {
  from: string;
  to: string;
}

export const hubBrandMarginApi = {
  /** Marge (avec / sans SAV) de toutes les marques sur la période. */
  overview: (period: HubBrandMarginPeriod, options?: { signal?: AbortSignal }) =>
    apiClient.get<HubBrandMarginOverview>('hub-app/brand-margin', {
      query: { from: period.from, to: period.to },
      signal: options?.signal,
    }),

  /** Détail d'une marque : produits, commandes, mois et SAV, éventuellement limités à une marketplace. */
  brand: (
    name: string,
    period: HubBrandMarginPeriod,
    origin: string | null,
    options?: { signal?: AbortSignal },
  ) =>
    apiClient.get<HubBrandMarginDetail>('hub-app/brand-margin/brand', {
      query: { name, from: period.from, to: period.to, origin },
      signal: options?.signal,
    }),
};
