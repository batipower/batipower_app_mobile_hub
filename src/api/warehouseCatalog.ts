import { apiClient } from '@/api/client';
import type { WarehouseCatalogEntry } from '@/types/orderActions';

/** Catalogue d'entrepôts (`GET warehouse/catalog`) : historiques et entrepôts créés dans l'admin. */
export const warehouseCatalogApi = {
  list(signal?: AbortSignal) {
    return apiClient.get<{ items: WarehouseCatalogEntry[] }>('warehouse/catalog', { signal });
  },
};
