import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubProductsApi } from '@/api/hubProducts';
import type { HubPricingPage, HubPricingRow, UpdateHubProductPayload } from '@/types/hubPricing';

import { PRICING_LIST_KEY } from '../queryKeys';
import { productColisKey } from './useProductColis';
import { pricingRowKey } from './usePricingRow';

type ListData = InfiniteData<HubPricingPage>;

/** Reporte localement un PATCH sur la ligne (mise à jour optimiste). */
export function applyPayload(row: HubPricingRow, payload: UpdateHubProductPayload): HubPricingRow {
  const next: HubPricingRow = { ...row, marketplaces: { ...row.marketplaces } };

  if (payload.fixPriceHT !== undefined) next.fixPriceHT = payload.fixPriceHT;
  if (payload.favorite !== undefined) next.favorite = payload.favorite;
  if (payload.productTags !== undefined) next.productTags = payload.productTags;
  if (payload.monitorBuyBox !== undefined) next.monitorBuyBox = payload.monitorBuyBox;
  if (payload.monitorBuyBoxByCountry !== undefined) {
    next.monitorBuyBoxByCountry = payload.monitorBuyBoxByCountry;
  }
  if (payload.monitorBuyBoxManoManoByCountry !== undefined) {
    next.monitorBuyBoxManoManoByCountry = payload.monitorBuyBoxManoManoByCountry;
  }
  if (payload.previSalesByMonth !== undefined) {
    next.potential = { ...next.potential, previSalesByMonth: payload.previSalesByMonth };
  }

  const targets = {
    amazon: payload.targetPriceAmazon,
    manoMano: payload.targetPriceManoMano,
    leroyMerlin: payload.targetPriceLeroyMerlin,
    castorama: payload.targetPriceCastorama,
    bricoman: payload.targetPriceBricoman,
  } as const;
  for (const key of Object.keys(targets) as (keyof typeof targets)[]) {
    const value = targets[key];
    if (value !== undefined) {
      next.marketplaces[key] = { ...next.marketplaces[key], targetPrice: value };
    }
  }
  return next;
}

/**
 * Édition légère d'une ligne (`PATCH hub-app/products/:reference`) : la ligne est mise à jour
 * tout de suite dans toutes les listes en cache, puis rétablie si l'enregistrement échoue.
 */
export function useUpdatePricingRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reference, payload }: { reference: string; payload: UpdateHubProductPayload }) =>
      hubProductsApi.update(reference, payload),
    onMutate: async ({ reference, payload }) => {
      await queryClient.cancelQueries({ queryKey: PRICING_LIST_KEY });
      const snapshots = queryClient.getQueriesData<ListData>({ queryKey: PRICING_LIST_KEY });
      queryClient.setQueriesData<ListData>({ queryKey: PRICING_LIST_KEY }, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: page.data.map((row) =>
              row.reference === reference ? applyPayload(row, payload) : row,
            ),
          })),
        };
      });
      const rowKey = pricingRowKey(reference);
      const previousRow = queryClient.getQueryData<HubPricingRow | null>(rowKey);
      if (previousRow) queryClient.setQueryData(rowKey, applyPayload(previousRow, payload));
      return { snapshots, rowKey, previousRow };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.previousRow) queryClient.setQueryData(context.rowKey, context.previousRow);
      toast.error(
        error instanceof ApiError ? error.message : "Impossible d'enregistrer la modification.",
      );
    },
    onSuccess: (_data, variables) => {
      toast.success('Ligne mise à jour');
      if (variables.payload.nbPieceByColis !== undefined) {
        void queryClient.invalidateQueries({ queryKey: productColisKey(variables.reference) });
      }
      if (variables.payload.productTags !== undefined) {
        // Les tags proposés par le filtre et le sélecteur changent avec l'édition.
        void queryClient.invalidateQueries({ queryKey: ['hub-pricing', 'tags'] });
      }
    },
  });
}
