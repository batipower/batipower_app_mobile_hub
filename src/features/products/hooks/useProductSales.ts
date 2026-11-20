import { useQuery } from '@tanstack/react-query';

import { hubProductsApi } from '@/api/hubProducts';
import type { HubStatsPeriod } from '@/types/product';

export const productSalesDailyKey = (reference: string | undefined) =>
  ['hub-product-sales-daily', reference] as const;

/**
 * Ventes journalières sur 365 jours : alimente à la fois le mini-histogramme de l'en-tête et
 * l'onglet Historique (une seule requête partagée, toutes les périodes sont dérivées côté app).
 */
export function useProductSalesDaily(reference: string | undefined, enabled = true) {
  return useQuery({
    queryKey: productSalesDailyKey(reference),
    queryFn: ({ signal }) => hubProductsApi.getSalesDaily(reference ?? '', 365, signal),
    enabled: enabled && !!reference,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export const productSalesStatsKey = (reference: string | undefined, period: HubStatsPeriod) =>
  ['hub-product-sales-stats', reference, period] as const;

/** Prix et volumes par marketplace sur la période (calculés et mis en cache par le back). */
export function useProductSalesStatistics(
  reference: string | undefined,
  period: HubStatsPeriod,
  enabled = true,
) {
  return useQuery({
    queryKey: productSalesStatsKey(reference, period),
    queryFn: ({ signal }) => hubProductsApi.getSalesStatistics(reference ?? '', period, signal),
    enabled: enabled && !!reference,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
