import type {
  AggregatedStatsByApiKey,
  ApiKeyConfig,
  ApiKeyRequestListResponse,
  ApiKeyRequestStatus,
  ApprovedApiKeyRequest,
  ApproveApiKeyRequestForm,
  CreateApiKeyForm,
  MaintenanceConfig,
  QuoteBankAccount,
  QuoteBankAccountEvent,
  QuoteBankAccountInput,
  SupportHoursConfig,
  UpdateApiKeyForm,
  UpdateSupportHoursPayload,
} from '@/types/adminPlatform';

import { apiClient } from './client';

/** Mode maintenance (`buyer-app/admin/maintenance`) : SUPERADMIN, exempté du blocage du back. */
export const adminMaintenanceApi = {
  getConfig: () => apiClient.get<MaintenanceConfig>('buyer-app/admin/maintenance'),
  setEnabled: (enabled: boolean) =>
    apiClient.patch<MaintenanceConfig>('buyer-app/admin/maintenance', { enabled }),
};

/** Horaires du support client (`support-chat/staff/hours`) : SUPERADMIN. */
export const adminSupportHoursApi = {
  getConfig: () => apiClient.get<SupportHoursConfig>('support-chat/staff/hours'),
  update: (payload: UpdateSupportHoursPayload) =>
    apiClient.patch<SupportHoursConfig>('support-chat/staff/hours', payload),
};

const BANK = 'buyer-app/admin/quote-bank-accounts';

/** RIB des devis réglés par virement : SUPERADMIN. */
export const adminQuoteBankAccountsApi = {
  list: () => apiClient.get<QuoteBankAccount[]>(BANK),
  events: () => apiClient.get<QuoteBankAccountEvent[]>(`${BANK}/events`),
  create: (input: QuoteBankAccountInput) => apiClient.post<QuoteBankAccount>(BANK, input),
  update: (id: string, input: Partial<QuoteBankAccountInput>) =>
    apiClient.patch<QuoteBankAccount>(`${BANK}/${encodeURIComponent(id)}`, input),
  activate: (id: string) =>
    apiClient.post<QuoteBankAccount>(`${BANK}/${encodeURIComponent(id)}/activate`),
  archive: (id: string) =>
    apiClient.post<QuoteBankAccount>(`${BANK}/${encodeURIComponent(id)}/archive`),
  unarchive: (id: string) =>
    apiClient.post<QuoteBankAccount>(`${BANK}/${encodeURIComponent(id)}/unarchive`),
};

const KEYS = 'buyer-app/admin/api-keys';

function configPath(apiKey: string, suffix = '') {
  return `${KEYS}/configs/${encodeURIComponent(apiKey)}${suffix}`;
}

/** Gestion des clés API (scrapers, extension HUB) : SUPERADMIN. */
export const adminApiKeysApi = {
  listConfigs: () => apiClient.get<ApiKeyConfig[]>(`${KEYS}/configs`),
  createConfig: (data: CreateApiKeyForm) => apiClient.post<ApiKeyConfig>(`${KEYS}/configs`, data),
  updateConfig: (apiKey: string, data: UpdateApiKeyForm) =>
    apiClient.put<ApiKeyConfig>(configPath(apiKey), data),
  activate: (apiKey: string) => apiClient.put<ApiKeyConfig>(configPath(apiKey, '/activate'), {}),
  deactivate: (apiKey: string) => apiClient.put<ApiKeyConfig>(configPath(apiKey, '/deactivate'), {}),
  deleteConfig: (apiKey: string) => apiClient.delete<ApiKeyConfig>(configPath(apiKey)),
  aggregatedStats: () => apiClient.get<AggregatedStatsByApiKey[]>(`${KEYS}/stats/aggregated`),
  listRequests: (status: ApiKeyRequestStatus = 'PENDING') =>
    apiClient.get<ApiKeyRequestListResponse>(`${KEYS}/requests`, {
      query: { status, limit: 200 },
    }),
  pendingCount: () => apiClient.get<{ total: number }>(`${KEYS}/requests/pending-count`),
  approveRequest: (uuid: string, data: ApproveApiKeyRequestForm) =>
    apiClient.post<ApprovedApiKeyRequest>(`${KEYS}/requests/${encodeURIComponent(uuid)}/approve`, data),
  rejectRequest: (uuid: string, rejectionReason?: string) =>
    apiClient.post<unknown>(`${KEYS}/requests/${encodeURIComponent(uuid)}/reject`, {
      rejectionReason,
    }),
};
