import { useMemo } from 'react';

import { useSubsidiaryOptions } from '@/features/admin/hooks/useAdminOptions';

import { groupSubsidiariesByWarehouse, type SubsidiaryGroup } from '../lib/subsidiaries';

/**
 * Filiales regroupées par entrepôt pour le filtre. `groups` est vide tant que la liste n'est pas chargée ;
 * `failed` masque le filtre si les options sont inaccessibles.
 */
export function useBrandMarginSubsidiaries(): { groups: SubsidiaryGroup[]; failed: boolean } {
  const query = useSubsidiaryOptions(true);
  const groups = useMemo(
    () => (query.data ? groupSubsidiariesByWarehouse(query.data) : []),
    [query.data],
  );
  return { groups, failed: query.isError };
}
