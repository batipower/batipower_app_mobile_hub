/**
 * Historique des recherches récentes du HUB (`hub-app/search-history`), partagé avec le
 * web : une entrée créée sur mobile apparaît sur le site, et inversement.
 * Aligné sur `front_externe_batipower/lib/api/hub-search-history.ts`.
 */

export type HubSearchHistoryType = 'PRODUCT' | 'ORDER' | 'RETURN' | 'ANALYZER';

export interface HubSearchHistoryEntry {
  id: string;
  type: HubSearchHistoryType;
  reference: string;
  label: string;
  subtitle: string | null;
  createdAt: string;
}

export interface RecordSearchHistoryPayload {
  type: HubSearchHistoryType;
  reference: string;
  label: string;
  subtitle?: string;
}
