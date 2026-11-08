import { useQuery } from '@tanstack/react-query';

import { adminAccountsApi } from '@/api/adminAccounts';

import {
  ADMIN_BRAND_OPTIONS_KEY,
  ADMIN_SUBSIDIARY_OPTIONS_KEY,
  ADMIN_WAREHOUSE_OPTIONS_KEY,
} from '../queryKeys';

/** Filiales (avec distributeur et entrepôt) pour les sélecteurs de rattachement. */
export function useSubsidiaryOptions(enabled = true) {
  return useQuery({
    queryKey: ADMIN_SUBSIDIARY_OPTIONS_KEY,
    queryFn: () => adminAccountsApi.subsidiaryOptions(true),
    enabled,
    staleTime: 60_000,
  });
}

/** Entrepôts de tous les distributeurs, y compris ceux sans filiale. */
export function useWarehouseOptions(enabled = true) {
  return useQuery({
    queryKey: ADMIN_WAREHOUSE_OPTIONS_KEY,
    queryFn: () => adminAccountsApi.warehouseOptions(),
    enabled,
    staleTime: 60_000,
  });
}

/** Catalogue des marques, pour l'accès d'un responsable de marque. */
export function useBrandOptions(enabled: boolean) {
  return useQuery({
    queryKey: ADMIN_BRAND_OPTIONS_KEY,
    queryFn: () => adminAccountsApi.brandOptions(),
    select: (data) => data.brands ?? [],
    enabled,
    staleTime: 5 * 60_000,
  });
}
