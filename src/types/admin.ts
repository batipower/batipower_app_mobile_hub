/**
 * Types du module ADMIN (comptes, inscriptions, activité), portés de
 * `front_externe_batipower/lib/types.ts`. Seuls les champs utiles à l'app mobile sont modélisés.
 */
import type { AppUserRole, BatipowerModule, PartnerRef } from './user';

export type BrandPlan = 'ESSENTIEL' | 'PREMIUM';
export type BrandAlertFrequency = 'NONE' | 'INSTANT' | 'DAILY' | 'WEEKLY';

/** Valeurs de l'enum historique des entrepôts (colonnes typées enum côté back). */
export type Warehouse = 'FLEVY' | 'DOMBASLE' | 'QG_BATIPOWER' | 'NANCY' | 'NICODEME' | 'FBA_AMAZON';

/** Catégorie (service) d'un compte : valeur de l'enum `CategoryType` du back. */
export type CategoryType = string;

export type VacationMode = 'MANUAL' | 'AUTOMATIC';

export interface PartnerLogo {
  logoUrl: string | null;
  logoNeedsLightBackground: boolean;
  logoWidth: number | null;
  logoHeight: number | null;
}

/** Entrepôt de distributeur rattaché à un compte. */
export interface DistributorWarehouseRef {
  id: string;
  name?: string;
  warehouse: Warehouse | null;
  code?: string | null;
}

/** Compte listé par `GET buyer-app/admin/users`. */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  code: string | null;
  role: AppUserRole;
  modules: BatipowerModule[];
  defaultModule: BatipowerModule;
  categoryTypes: CategoryType[];
  warehouse: Warehouse | null;
  isActive: boolean;
  isOnVacation: boolean;
  canExportNego: boolean;
  canAccessAccounting: boolean;
  prismEnabled?: boolean;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  brands?: string[];
  brandPlan?: BrandPlan | null;
  brandAlertFrequency?: BrandAlertFrequency;
  subsidiaryId: string | null;
  subsidiary: (PartnerRef & { isActive?: boolean }) | null;
  partnerDistributor: (PartnerRef & { isActive?: boolean }) | null;
  distributorWarehouse: DistributorWarehouseRef | null;
}

export interface PendingRegistration {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  modules?: BatipowerModule[];
  defaultModule?: BatipowerModule;
}

/** Filiale proposée dans les sélecteurs de rattachement (`GET admin/partners/subsidiary-options`). */
export interface SubsidiaryOption extends PartnerLogo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  distributorId: string;
  distributorName: string;
  distributorActive: boolean;
  distributorWarehouseId: string;
  warehouseName: string;
  warehouse: Warehouse | null;
  /** Clé de l'entrepôt : valeur enum, sinon code de l'entrepôt libre (ex. LILLE). */
  warehouseCode?: string | null;
}

export interface DistributorWarehouseOption {
  id: string;
  name: string;
  code?: string | null;
  warehouse: Warehouse | null;
  distributorId: string;
  distributorName: string;
  distributorActive: boolean;
}

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | (string & {});

/** Résumé d'activité — `GET buyer-app/admin/users/activity`. */
export interface UserActivitySummary {
  id: string;
  email: string;
  name: string;
  code: string | null;
  role: AppUserRole;
  registrationStatus: RegistrationStatus;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  loginCount: number;
  productActionsCount: number;
  exportDownloadCount: number;
  wasActiveInPeriod: boolean;
}

/** Entrée d'historique d'export négo — `GET buyer-app/admin/export-downloads`. */
export interface ExportDownloadEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: AppUserRole | null;
  warehouse: string | null;
  brands: string[];
  countries: string[];
  rowCount: number;
  filters: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface BrandOption {
  name: string;
  productCount: number;
}

/** `GET brand-app/brands` (vue SUPERADMIN : catalogue complet). */
export interface BrandAppContext {
  brands: BrandOption[];
}

export interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  role: AppUserRole;
  code?: string;
  categoryTypes?: CategoryType[];
  warehouse?: Warehouse;
  subsidiaryId?: string;
  modules?: BatipowerModule[];
  defaultModule?: BatipowerModule;
  brands?: string[];
  brandPlan?: BrandPlan | null;
  brandAlertFrequency?: BrandAlertFrequency;
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  code?: string | null;
  role?: AppUserRole;
  categoryTypes?: CategoryType[];
  warehouse?: Warehouse | null;
  subsidiaryId?: string | null;
  isActive?: boolean;
  isOnVacation?: boolean;
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  canExportNego?: boolean;
  canAccessAccounting?: boolean;
  prismEnabled?: boolean;
  modules?: BatipowerModule[];
  defaultModule?: BatipowerModule;
  brands?: string[];
  brandPlan?: BrandPlan | null;
  brandAlertFrequency?: BrandAlertFrequency;
}

export interface ApproveRegistrationPayload {
  role: AppUserRole;
  categoryTypes?: CategoryType[];
  warehouse?: Warehouse;
  subsidiaryId?: string;
  code?: string;
  modules?: BatipowerModule[];
  defaultModule?: BatipowerModule;
  brands?: string[];
  brandPlan?: BrandPlan | null;
  brandAlertFrequency?: BrandAlertFrequency;
}
