import { useQuery } from '@tanstack/react-query';

import { adminApiKeysApi, adminMaintenanceApi, adminQuoteBankAccountsApi, adminSupportHoursApi } from '@/api/adminPlatform';

import {
  ADMIN_API_KEYS_CONFIGS_KEY,
  ADMIN_API_KEYS_REQUESTS_KEY,
  ADMIN_API_KEYS_STATS_KEY,
  ADMIN_BANK_ACCOUNTS_KEY,
  ADMIN_BANK_EVENTS_KEY,
  ADMIN_MAINTENANCE_KEY,
  ADMIN_SUPPORT_HOURS_KEY,
} from '../queryKeys';

export function useMaintenanceConfig() {
  return useQuery({ queryKey: ADMIN_MAINTENANCE_KEY, queryFn: () => adminMaintenanceApi.getConfig() });
}

export function useSupportHoursConfig() {
  return useQuery({ queryKey: ADMIN_SUPPORT_HOURS_KEY, queryFn: () => adminSupportHoursApi.getConfig() });
}

export function useBankAccounts() {
  return useQuery({ queryKey: ADMIN_BANK_ACCOUNTS_KEY, queryFn: () => adminQuoteBankAccountsApi.list() });
}

export function useBankAccountEvents(enabled = true) {
  return useQuery({
    queryKey: ADMIN_BANK_EVENTS_KEY,
    queryFn: () => adminQuoteBankAccountsApi.events(),
    enabled,
  });
}

export function useApiKeyConfigs() {
  return useQuery({ queryKey: ADMIN_API_KEYS_CONFIGS_KEY, queryFn: () => adminApiKeysApi.listConfigs() });
}

/** Demandes de clé en attente (extension HUB). */
export function useApiKeyRequests() {
  return useQuery({
    queryKey: ADMIN_API_KEYS_REQUESTS_KEY,
    queryFn: () => adminApiKeysApi.listRequests('PENDING'),
  });
}

export function useApiKeyStats() {
  return useQuery({ queryKey: ADMIN_API_KEYS_STATS_KEY, queryFn: () => adminApiKeysApi.aggregatedStats() });
}
