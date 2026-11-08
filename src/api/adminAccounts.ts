import type {
  AdminUser,
  ApproveRegistrationPayload,
  BrandAppContext,
  CreateUserPayload,
  DistributorWarehouseOption,
  ExportDownloadEntry,
  PendingRegistration,
  SubsidiaryOption,
  UpdateUserPayload,
  UserActivitySummary,
  VacationMode,
} from '@/types/admin';

import { apiClient } from './client';

const PARTNERS = 'buyer-app/admin/partners';

/**
 * Comptes, inscriptions et activité du module ADMIN (portage de `lib/api/admin.ts` du web).
 * Toutes ces routes sont réservées au SUPERADMIN côté back (`@Roles(SUPERADMIN)`).
 */
export const adminAccountsApi = {
  listUsers: () => apiClient.get<AdminUser[]>('buyer-app/admin/users'),
  createUser: (data: CreateUserPayload) => apiClient.post<AdminUser>('buyer-app/admin/users', data),
  updateUser: (id: string, data: UpdateUserPayload) =>
    apiClient.patch<AdminUser>(`buyer-app/admin/users/${encodeURIComponent(id)}`, data),
  unlockUser: (id: string) =>
    apiClient.patch<AdminUser>(`buyer-app/admin/users/${encodeURIComponent(id)}/unlock`, {}),

  getVacationConfig: () => apiClient.get<{ mode: VacationMode }>('buyer-app/admin/vacation/config'),
  updateVacationConfig: (mode: VacationMode) =>
    apiClient.patch<{ mode: VacationMode }>('buyer-app/admin/vacation/config', { mode }),

  pendingRegistrations: () => apiClient.get<PendingRegistration[]>('buyer-app/admin/registrations'),
  approveRegistration: (id: string, data: ApproveRegistrationPayload) =>
    apiClient.patch<AdminUser>(
      `buyer-app/admin/registrations/${encodeURIComponent(id)}/approve`,
      data,
    ),
  rejectRegistration: (id: string, reason: string) =>
    apiClient.patch<{ message: string }>(
      `buyer-app/admin/registrations/${encodeURIComponent(id)}/reject`,
      { reason },
    ),

  getUsersActivity: (params?: { days?: number; activeOnly?: boolean }) =>
    apiClient.get<UserActivitySummary[]>('buyer-app/admin/users/activity', {
      query: {
        days: params?.days,
        activeOnly: params?.activeOnly ? 'true' : undefined,
      },
    }),
  getExportDownloads: (params?: { days?: number }) =>
    apiClient.get<ExportDownloadEntry[]>('buyer-app/admin/export-downloads', {
      query: { days: params?.days },
    }),

  subsidiaryOptions: (includeInactive = true) =>
    apiClient.get<SubsidiaryOption[]>(`${PARTNERS}/subsidiary-options`, {
      query: { includeInactive: includeInactive ? 'true' : undefined },
    }),
  warehouseOptions: () => apiClient.get<DistributorWarehouseOption[]>(`${PARTNERS}/warehouse-options`),

  /** Catalogue complet des marques (vue SUPERADMIN), pour les responsables de marque. */
  brandOptions: () => apiClient.get<BrandAppContext>('brand-app/brands'),
};
