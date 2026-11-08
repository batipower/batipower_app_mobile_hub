import type { DistributorWarehouseOption, PartnerLogo, Warehouse } from '@/types/admin';
import type {
  AdminDistributor,
  AdminDistributorsPage,
  AdminSubsidiary,
  AdminWarehouseConfig,
  EbatproAccount,
  EbatproAccountCreatePayload,
  EbatproAccountsResponse,
  EbatproAccountUpdatePayload,
  NegoMarginJob,
  UpdateDistributorPayload,
  UpdateWarehouseConfigInput,
} from '@/types/adminPartners';
import { buildFileFormData, type PickedFile } from '@/lib/pickAttachment';

import { apiClient } from './client';

const PARTNERS = 'buyer-app/admin/partners';
const EBATPRO = 'buyer-app/admin/ebatpro-accounts';
const enc = encodeURIComponent;

export type LogoKind = 'distributor' | 'subsidiary';
const logoSegment = (kind: LogoKind) => (kind === 'distributor' ? 'distributors' : 'subsidiaries');

/** Distributeurs, entrepôts et filiales (`buyer-app/admin/partners/*`) : SUPERADMIN. */
export const adminPartnersApi = {
  /** Un seul appel (200 = maximum du back) : la recherche et les filtres s'appliquent côté client. */
  listDistributors: (search?: string) =>
    apiClient.get<AdminDistributorsPage>(`${PARTNERS}/distributors`, {
      query: { page: 1, pageSize: 200, search },
    }),
  warehouseOptions: () => apiClient.get<DistributorWarehouseOption[]>(`${PARTNERS}/warehouse-options`),
  createDistributor: (data: { name: string; slug?: string }) =>
    apiClient.post<AdminDistributor>(`${PARTNERS}/distributors`, data),
  updateDistributor: (id: string, data: UpdateDistributorPayload) =>
    apiClient.patch<AdminDistributor>(`${PARTNERS}/distributors/${enc(id)}`, data),
  deleteDistributor: (id: string) =>
    apiClient.delete<{ success: boolean }>(`${PARTNERS}/distributors/${enc(id)}`),

  setOrdersAffectation: (id: string, enabled: boolean) =>
    apiClient.patch<{
      id: string;
      ordersAffectationEnabled: boolean;
      ordersAffectationUpdatedAt: string | null;
      ordersAffectationUpdatedBy: string | null;
      pendingOrders: number;
    }>(`${PARTNERS}/distributors/${enc(id)}/orders-affectation`, { enabled }),
  setNegoAutoDeploy: (id: string, paused: boolean) =>
    apiClient.patch<{
      id: string;
      negoAutoDeployPaused: boolean;
      negoAutoDeployPausedAt: string | null;
      negoAutoDeployPausedBy: string | null;
      pendingProposals: number;
    }>(`${PARTNERS}/distributors/${enc(id)}/nego-auto-deploy`, { paused }),
  /** Enregistre la marge puis lance le recalcul en arrière-plan : suivre `getNegoMarginJob`. */
  setNegoMargin: (id: string, marginPct: number) =>
    apiClient.patch<{
      id: string;
      negoMarginPct: number;
      negoMarginUpdatedAt: string | null;
      negoMarginUpdatedBy: string | null;
      job: NegoMarginJob | null;
    }>(`${PARTNERS}/distributors/${enc(id)}/nego-margin`, { marginPct }),
  getNegoMarginJob: (id: string) =>
    apiClient.get<NegoMarginJob | null>(`${PARTNERS}/distributors/${enc(id)}/nego-margin/job`),
  setDepDiscount: (id: string, discountPct: number) =>
    apiClient.patch<{
      id: string;
      depDiscountPct: number;
      depDiscountUpdatedAt: string | null;
      depDiscountUpdatedBy: string | null;
    }>(`${PARTNERS}/distributors/${enc(id)}/dep-discount`, { discountPct }),

  addWarehouse: (
    distributorId: string,
    data: { name: string; warehouse?: Warehouse; depSourceWarehouseId?: string },
  ) =>
    apiClient.post<{ id: string; name: string; code?: string | null; warehouse: Warehouse | null }>(
      `${PARTNERS}/distributors/${enc(distributorId)}/warehouses`,
      data,
    ),
  removeWarehouse: (distributorId: string, warehouseId: string) =>
    apiClient.delete<{ success: boolean }>(
      `${PARTNERS}/distributors/${enc(distributorId)}/warehouses/${enc(warehouseId)}`,
    ),
  updateWarehouseOrderSettings: (
    distributorId: string,
    warehouseId: string,
    data: { acceptsOrders?: boolean; psOrderStateId?: number | null },
  ) =>
    apiClient.patch<{ id: string; acceptsOrders: boolean; psOrderStateId: number | null; pendingOrders: number }>(
      `${PARTNERS}/distributors/${enc(distributorId)}/warehouses/${enc(warehouseId)}/orders`,
      data,
    ),
  setWarehouseActive: (distributorId: string, warehouseId: string, isActive: boolean) =>
    apiClient.patch<{ id: string; name: string; isActive: boolean }>(
      `${PARTNERS}/distributors/${enc(distributorId)}/warehouses/${enc(warehouseId)}`,
      { isActive },
    ),
  getWarehouseConfig: (distributorId: string, warehouseId: string) =>
    apiClient.get<AdminWarehouseConfig>(
      `${PARTNERS}/distributors/${enc(distributorId)}/warehouses/${enc(warehouseId)}/config`,
    ),
  updateWarehouseConfig: (distributorId: string, warehouseId: string, data: UpdateWarehouseConfigInput) =>
    apiClient.put<AdminWarehouseConfig>(
      `${PARTNERS}/distributors/${enc(distributorId)}/warehouses/${enc(warehouseId)}/config`,
      data,
    ),

  createSubsidiary: (warehouseId: string, data: { name: string; slug?: string; emailSenderName?: string }) =>
    apiClient.post<AdminSubsidiary>(`${PARTNERS}/warehouses/${enc(warehouseId)}/subsidiaries`, data),
  updateSubsidiary: (
    id: string,
    data: {
      name?: string;
      isActive?: boolean;
      emailSenderName?: string | null;
      distributorWarehouseId?: string;
      logoNeedsLightBackground?: boolean;
    },
  ) => apiClient.patch<AdminSubsidiary>(`${PARTNERS}/subsidiaries/${enc(id)}`, data),
  deleteSubsidiary: (id: string) =>
    apiClient.delete<{ success: boolean }>(`${PARTNERS}/subsidiaries/${enc(id)}`),

  /** Logo (PNG, JPG, WebP, SVG ; 2 Mo max) : le back le convertit en PNG et le redimensionne. */
  uploadLogo: (kind: LogoKind, id: string, file: PickedFile, needsLightBackground: boolean) =>
    apiClient.upload<PartnerLogo>(
      `${PARTNERS}/${logoSegment(kind)}/${enc(id)}/logo`,
      buildFileFormData(file, { needsLightBackground: String(needsLightBackground) }),
    ),
  removeLogo: (kind: LogoKind, id: string) =>
    apiClient.delete<unknown>(`${PARTNERS}/${logoSegment(kind)}/${enc(id)}/logo`),
};

/** Comptes eBatPro (`buyer-app/admin/ebatpro-accounts`) : SUPERADMIN. */
export const adminEbatproApi = {
  list: () => apiClient.get<EbatproAccountsResponse>(EBATPRO),
  create: (data: EbatproAccountCreatePayload) => apiClient.post<EbatproAccount>(EBATPRO, data),
  update: (id: string, data: EbatproAccountUpdatePayload) =>
    apiClient.patch<EbatproAccount>(`${EBATPRO}/${enc(id)}`, data),
  setDefault: (id: string) => apiClient.post<EbatproAccount>(`${EBATPRO}/${enc(id)}/set-default`, {}),
  test: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`${EBATPRO}/${enc(id)}/test`, {}),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`${EBATPRO}/${enc(id)}`),
};
