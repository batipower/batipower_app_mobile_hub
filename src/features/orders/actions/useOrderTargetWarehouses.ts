import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { warehouseCatalogApi } from '@/api/warehouseCatalog';

import {
  FALLBACK_TARGET_WAREHOUSES,
  orderTargetOptions,
  type WarehouseOption,
} from './orderActionRules';

/**
 * Entrepôts pouvant recevoir une commande (transfert, annulation, split), d'après le catalogue du
 * back (`orderAffectationReady`). Pendant mobile de `useOrderTargetWarehouses` du web : repli sur
 * les entrepôts historiques tant que le catalogue est absent ou en erreur.
 * `alwaysInclude` garde l'entrepôt actuel de la commande même s'il n'accepte plus de commandes.
 */
export function useOrderTargetWarehouses(
  alwaysInclude: readonly (string | null | undefined)[] = [],
  enabled = true,
) {
  const query = useQuery({
    queryKey: ['warehouse-catalog'],
    queryFn: ({ signal }) => warehouseCatalogApi.list(signal),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  const key = alwaysInclude.join('|');
  const options = useMemo<WarehouseOption[]>(() => {
    const items = query.data?.items;
    if (!items) {
      const keep = alwaysInclude.filter((code): code is string => !!code);
      const extra = keep
        .filter((code) => !FALLBACK_TARGET_WAREHOUSES.some((o) => o.value === code))
        .map((code) => ({ value: code, label: code }));
      return [...FALLBACK_TARGET_WAREHOUSES, ...extra];
    }
    return orderTargetOptions(items, alwaysInclude);
    // `key` résume `alwaysInclude` (tableau recréé à chaque rendu).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, key]);

  const label = (code: string | null | undefined) =>
    options.find((o) => o.value === code)?.label ?? code ?? '—';

  return { options, label, loading: query.isPending && query.fetchStatus !== 'idle' };
}
