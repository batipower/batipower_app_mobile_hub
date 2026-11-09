import { apiClient } from '@/api/client';
import type {
  HubBrandMarginDetail,
  HubBrandMarginOverview,
  HubBrandStockQg,
} from '@/types/hubBrandMargin';

/**
 * Marge par marque du HUB (`hub-app/brand-margin*`), SUPERADMIN. Contrat repris de
 * `front_externe_batipower/lib/api/hub-brand-margin.ts`. La période est limitée à 366 jours par l'API.
 */

export interface HubBrandMarginPeriod {
  from: string;
  to: string;
}

/** Filtre « filiales » : codes d'entrepôt triés et séparés par des virgules ; absent = toutes. */
function warehousesQuery(warehouses: readonly string[]): { warehouses?: string } {
  return warehouses.length > 0 ? { warehouses: [...warehouses].sort().join(',') } : {};
}

export const hubBrandMarginApi = {
  /** Marge (avec / sans SAV) de toutes les marques sur la période. */
  overview: (
    period: HubBrandMarginPeriod,
    warehouses: readonly string[],
    options?: { signal?: AbortSignal },
  ) =>
    apiClient.get<HubBrandMarginOverview>('hub-app/brand-margin', {
      query: { from: period.from, to: period.to, ...warehousesQuery(warehouses) },
      signal: options?.signal,
    }),

  /** Détail d'une marque : produits, commandes, mois et SAV, éventuellement limités à une marketplace. */
  brand: (
    name: string,
    period: HubBrandMarginPeriod,
    origin: string | null,
    warehouses: readonly string[],
    options?: { signal?: AbortSignal },
  ) =>
    apiClient.get<HubBrandMarginDetail>('hub-app/brand-margin/brand', {
      query: {
        name,
        from: period.from,
        to: period.to,
        origin,
        ...warehousesQuery(warehouses),
      },
      signal: options?.signal,
    }),

  /** Stock QG Batipower d'une marque : références en stock, coût et valeur, à l'instant t. */
  stockQg: (name: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<HubBrandStockQg>('hub-app/brand-margin/stock-qg', {
      query: { name },
      signal: options?.signal,
    }),
};
