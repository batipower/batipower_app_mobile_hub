import { API_KEY_WAREHOUSES, type ApiKeyWarehouse } from '@/types/adminPlatform';

export function isApiKeyWarehouse(value: unknown): value is ApiKeyWarehouse {
  return typeof value === 'string' && (API_KEY_WAREHOUSES as readonly string[]).includes(value);
}

export const UNCONFIGURED_NAME = 'Non configuré';
