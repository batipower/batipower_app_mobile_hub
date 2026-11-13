import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubProductWebsiteApi } from '@/api/hubProductWebsite';
import { PRICING_LIST_KEY } from '@/features/pricing/queryKeys';
import { pricingRowKey } from '@/features/pricing/hooks/usePricingRow';
import type { UpdateHubWebsiteDisplayPricePayload } from '@/types/hubWebsite';

import { websitePricingKey } from './useWebsitePricing';

/**
 * Modification du prix catalogue du site (`PUT .../website/display-price`). Le back renvoie
 * le nouvel état (marge comprise) : il remplace le cache de la fiche, et la page Pricing
 * (qui affiche le prix site TTC) est rechargée.
 */
export function useUpdateWebsitePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reference,
      payload,
    }: {
      reference: string;
      payload: UpdateHubWebsiteDisplayPricePayload;
    }) => hubProductWebsiteApi.updateDisplayPrice(reference, payload),
    onSuccess: (data, { reference }) => {
      queryClient.setQueryData(websitePricingKey(reference), data);
      void queryClient.invalidateQueries({ queryKey: PRICING_LIST_KEY });
      void queryClient.invalidateQueries({ queryKey: pricingRowKey(reference) });
      toast.success('Prix du site mis à jour');
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Impossible d'enregistrer le prix du site.",
      );
    },
  });
}
