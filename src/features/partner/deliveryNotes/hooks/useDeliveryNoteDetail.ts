import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { partnerDeliveryNotesApi } from '@/api/partnerDeliveryNotes';

import { partnerDeliveryNoteDetailKey } from '../../queryKeys';

/** Fiche d'un BL avec toutes ses lignes (en écart ou non). */
export function useDeliveryNoteDetail(uuid: string | undefined) {
  const query = useQuery({
    queryKey: partnerDeliveryNoteDetailKey(uuid ?? ''),
    queryFn: ({ signal }) => partnerDeliveryNotesApi.detail(uuid as string, { signal }),
    enabled: !!uuid,
    staleTime: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  return {
    note: query.data,
    loading: query.isPending,
    error: query.error,
    notFound: query.error instanceof ApiError && query.error.status === 404,
    refetch: query.refetch,
  };
}
