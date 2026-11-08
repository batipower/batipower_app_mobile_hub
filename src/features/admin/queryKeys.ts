/** Clés TanStack Query du module ADMIN. Chaque racine permet d'invalider toute une famille. */
export const ADMIN_USERS_KEY = ['admin-users'] as const;
export const ADMIN_REGISTRATIONS_KEY = ['admin-registrations'] as const;
export const ADMIN_VACATION_CONFIG_KEY = ['admin-vacation-config'] as const;
export const ADMIN_SUBSIDIARY_OPTIONS_KEY = ['admin-partner-subsidiary-options'] as const;
export const ADMIN_WAREHOUSE_OPTIONS_KEY = ['admin-partner-warehouse-options'] as const;
export const ADMIN_BRAND_OPTIONS_KEY = ['admin-brand-options'] as const;
export const adminActivityKey = (days: number, activeOnly: boolean) =>
  ['admin-users-activity', days, activeOnly] as const;
export const adminExportsKey = (days: number) => ['admin-export-downloads', days] as const;

export const ADMIN_MAINTENANCE_KEY = ['admin-maintenance'] as const;
export const ADMIN_SUPPORT_HOURS_KEY = ['admin-support-hours'] as const;
export const ADMIN_BANK_ACCOUNTS_KEY = ['admin-quote-bank-accounts'] as const;
export const ADMIN_BANK_EVENTS_KEY = ['admin-quote-bank-account-events'] as const;

export const ADMIN_API_KEYS_ROOT_KEY = ['admin-api-keys'] as const;
export const ADMIN_API_KEYS_CONFIGS_KEY = ['admin-api-keys', 'configs'] as const;
export const ADMIN_API_KEYS_STATS_KEY = ['admin-api-keys', 'stats'] as const;
export const ADMIN_API_KEYS_REQUESTS_KEY = ['admin-api-keys', 'requests', 'PENDING'] as const;
export const ADMIN_API_KEYS_PENDING_COUNT_KEY = ['admin-api-keys', 'pending-count'] as const;

export const ADMIN_DISTRIBUTORS_KEY = ['admin-partner-distributors'] as const;
export const ADMIN_EBATPRO_ACCOUNTS_KEY = ['admin-ebatpro-accounts'] as const;
export const adminWarehouseConfigKey = (distributorId: string, warehouseId: string) =>
  ['admin-warehouse-config', distributorId, warehouseId] as const;
export const adminNegoMarginJobKey = (distributorId: string) =>
  ['admin-nego-margin-job', distributorId] as const;
