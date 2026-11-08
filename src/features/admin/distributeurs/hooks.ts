import { useQuery, useQueryClient } from '@tanstack/react-query';

import { adminEbatproApi, adminPartnersApi } from '@/api/adminPartners';
import type { AdminDistributor, AdminDistributorWarehouse } from '@/types/adminPartners';

import {
  ADMIN_DISTRIBUTORS_KEY,
  ADMIN_EBATPRO_ACCOUNTS_KEY,
  ADMIN_SUBSIDIARY_OPTIONS_KEY,
  ADMIN_USERS_KEY,
  ADMIN_WAREHOUSE_OPTIONS_KEY,
} from '../queryKeys';

/** Tous les distributeurs (filtres et recherche côté client, comme le web). */
export function useDistributors() {
  return useQuery({
    queryKey: ADMIN_DISTRIBUTORS_KEY,
    queryFn: () => adminPartnersApi.listDistributors(),
    select: (page) => page.items,
  });
}

/** Un distributeur de la liste en cache, avec l'un de ses entrepôts le cas échéant. */
export function useDistributor(id: string | undefined, warehouseId?: string) {
  const query = useDistributors();
  const distributor: AdminDistributor | undefined = id ? query.data?.find((d) => d.id === id) : undefined;
  const warehouse: AdminDistributorWarehouse | undefined = warehouseId
    ? distributor?.warehouses.find((w) => w.id === warehouseId)
    : undefined;
  return { ...query, distributor, warehouse };
}

export function useEbatproAccounts() {
  return useQuery({
    queryKey: ADMIN_EBATPRO_ACCOUNTS_KEY,
    queryFn: () => adminEbatproApi.list(),
  });
}

/** Rafraîchit tout ce qui dépend de la hiérarchie distributeur > entrepôt > filiale. */
export function useRefreshPartners() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_DISTRIBUTORS_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_SUBSIDIARY_OPTIONS_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_WAREHOUSE_OPTIONS_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_EBATPRO_ACCOUNTS_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
    ]);
}
