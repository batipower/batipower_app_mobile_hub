import { apiClient } from '@/api/client';

export type QuotaStatus = 'ok' | 'warn' | 'critical' | 'unknown';
export type QuotaGroup = 'email' | 'api';

export interface QuotaItem {
  key: string;
  group: QuotaGroup;
  label: string;
  used: number | null;
  limit: number | null;
  /** Pourcentage consommé, arrondi, non plafonné ; null si inconnu. */
  percent: number | null;
  status: QuotaStatus;
  detail: string | null;
  /** Prochaine remise à zéro (ISO), si connue. */
  resetAt: string | null;
  /** Page HUB (web) où gérer ce quota. */
  href: string | null;
}

export interface QuotasSummary {
  generatedAt: string;
  overall: QuotaStatus;
  items: QuotaItem[];
}

/**
 * Quotas surveillés (emails, API et scraping). Pendant mobile de `hub-quotas.ts` du web ;
 * route réservée au SUPERADMIN.
 */
export const hubQuotasApi = {
  summary({ signal }: { signal?: AbortSignal } = {}) {
    return apiClient.get<QuotasSummary>('hub-app/quotas/summary', { signal });
  },
};
