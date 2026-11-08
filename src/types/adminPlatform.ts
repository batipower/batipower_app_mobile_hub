/**
 * Types de la partie Plateforme du module ADMIN (clés API, maintenance, horaires du support, RIB
 * des devis), portés de `front_externe_batipower/lib/api/*` et `lib/types/api-keys.ts`.
 */

// ─── Clés API ────────────────────────────────────────────────────────────────

export type ApiKeyWarehouse = 'QG_BATIPOWER' | 'FLEVY' | 'NANCY' | 'DOMBASLE';

/** Entrepôts de clés API : capacité PREPARATION du catalogue (QG, NANCY, FLEVY, DOMBASLE). */
export const API_KEY_WAREHOUSES: readonly ApiKeyWarehouse[] = [
  'QG_BATIPOWER',
  'NANCY',
  'FLEVY',
  'DOMBASLE',
];

export function formatApiKeyWarehouse(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

export function previewApiKey(apiKey: string, length = 20): string {
  if (apiKey.length <= length) return apiKey;
  return `${apiKey.slice(0, length)}…`;
}

export interface ApiKeyConfig {
  uuid: string;
  apiKey: string;
  name: string;
  warehouse: ApiKeyWarehouse | string;
  isActive: boolean;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Présent pour les clés self-service de l'extension HUB. */
  appUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AggregatedStatsByApiKey {
  apiKey: string;
  apiKeyPreview: string;
  name: string;
  warehouse: ApiKeyWarehouse | string | null;
  isActive: boolean;
  totalCalls: number;
  uniqueRoutes: number;
}

export interface CreateApiKeyForm {
  apiKey: string;
  name: string;
  warehouse: ApiKeyWarehouse;
  description?: string;
}

export interface UpdateApiKeyForm {
  name?: string;
  warehouse?: ApiKeyWarehouse;
  isActive?: boolean;
  description?: string;
}

export type ApiKeyRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface ApiKeyRequest {
  uuid: string;
  createdAt: string;
  updatedAt: string;
  requesterName: string;
  requesterEmail: string | null;
  warehouse: string | null;
  reason: string | null;
  deviceLabel: string | null;
  extensionVersion: string | null;
  status: ApiKeyRequestStatus;
  issuedApiKeyPreview: string | null;
  claimedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  expiresAt: string;
}

export interface ApiKeyRequestListResponse {
  data: ApiKeyRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface ApproveApiKeyRequestForm {
  name: string;
  warehouse: ApiKeyWarehouse;
  description?: string;
  /** Clé imposée par l'admin. Si absente, le backend la génère. */
  apiKey?: string;
}

/** Réponse de l'approbation : `apiKey` en clair, renvoyée une seule fois. */
export interface ApprovedApiKeyRequest extends ApiKeyRequest {
  apiKey: string;
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export interface MaintenanceConfig {
  enabled: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

// ─── Horaires du support ─────────────────────────────────────────────────────

export interface SupportTimeRange {
  /** "HH:mm" (24 h). */
  start: string;
  /** "HH:mm" (24 h), strictement après `start`. */
  end: string;
}

/** Clés "0" (dimanche) à "6" (samedi), comme `Date#getDay`. */
export type SupportWeeklySchedule = Record<string, SupportTimeRange[]>;

export interface SupportHoursConfig {
  timezone: string;
  weekly: SupportWeeklySchedule;
  forceClosed: boolean;
  forceClosedMessage: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface UpdateSupportHoursPayload {
  weekly?: SupportWeeklySchedule;
  forceClosed?: boolean;
  forceClosedMessage?: string | null;
}

// ─── RIB des devis ───────────────────────────────────────────────────────────

export type QuoteBankAccountEventAction =
  | 'CREATED'
  | 'UPDATED'
  | 'ACTIVATED'
  | 'ARCHIVED'
  | 'UNARCHIVED';

export interface QuoteBankAccount {
  id: string;
  label: string;
  holder: string;
  iban: string;
  bic: string;
  domiciliation: string;
  bankCode: string | null;
  branchCode: string | null;
  accountNumber: string | null;
  ribKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  archivedAt: string | null;
}

export interface QuoteBankAccountEvent {
  id: string;
  bankAccountId: string;
  bankAccountLabel: string;
  bankAccountIban: string;
  action: QuoteBankAccountEventAction;
  actorLabel: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface QuoteBankAccountInput {
  label: string;
  holder: string;
  iban: string;
  bic: string;
  domiciliation: string;
}
