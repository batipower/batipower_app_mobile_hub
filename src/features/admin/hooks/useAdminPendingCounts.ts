import { useQuery } from '@tanstack/react-query';

import { adminAccountsApi } from '@/api/adminAccounts';
import { adminApiKeysApi } from '@/api/adminPlatform';

import { ADMIN_API_KEYS_PENDING_COUNT_KEY, ADMIN_REGISTRATIONS_KEY } from '../queryKeys';

const REFRESH_MS = 60_000;

/** Liste des inscriptions en attente : sert à l'écran et au badge de l'onglet (même requête). */
export function usePendingRegistrations(enabled = true) {
  return useQuery({
    queryKey: ADMIN_REGISTRATIONS_KEY,
    queryFn: () => adminAccountsApi.pendingRegistrations(),
    enabled,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
  });
}

/** Nombre de demandes de clé API en attente. */
export function useApiKeyRequestsPendingCount(enabled = true) {
  return useQuery({
    queryKey: ADMIN_API_KEYS_PENDING_COUNT_KEY,
    queryFn: () => adminApiKeysApi.pendingCount(),
    enabled,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
  });
}

/**
 * Compteurs des badges de la barre d'onglets ADMIN, rafraîchis toutes les minutes tant que le module
 * est ouvert (même logique que `Sidebar.tsx` côté web ; l'actualisation est suspendue en
 * arrière-plan par le `focusManager`).
 */
export function useAdminPendingCounts() {
  const registrations = usePendingRegistrations();
  const apiKeys = useApiKeyRequestsPendingCount();
  return {
    registrations: registrations.data?.length ?? 0,
    apiKeyRequests: apiKeys.data?.total ?? 0,
  };
}
