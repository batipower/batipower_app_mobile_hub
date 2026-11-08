import { useQuery } from '@tanstack/react-query';

import { partnerDeliveryNotesApi } from '@/api/partnerDeliveryNotes';

import { PARTNER_DELIVERY_NOTES_KEY } from '../../queryKeys';

/** Marques présentes sur les BL du compte, pour le filtre de marque. */
export function useDeliveryNoteBrands() {
  return useQuery({
    queryKey: [...PARTNER_DELIVERY_NOTES_KEY, 'brands'],
    queryFn: ({ signal }) => partnerDeliveryNotesApi.listBrands({ signal }),
    staleTime: 5 * 60_000,
  });
}
