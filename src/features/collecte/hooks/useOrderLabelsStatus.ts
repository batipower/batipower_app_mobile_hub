import { useQuery } from '@tanstack/react-query';

import { hubCollecteApi } from '@/api/hubCollecte';

import { collecteLabelsKey } from '../queryKeys';

/** Historique des étiquettes d'une commande (impression, pointage de collecte). */
export function useOrderLabelsStatus(reference: string | null) {
  return useQuery({
    queryKey: collecteLabelsKey(reference ?? ''),
    queryFn: ({ signal }) => hubCollecteApi.orderLabelsStatus(reference ?? '', { signal }),
    enabled: !!reference,
    staleTime: 10_000,
  });
}
