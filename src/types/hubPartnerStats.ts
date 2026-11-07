/**
 * Types des statistiques PARTNER du HUB (`hub-app/partner-stats`, SUPERADMIN), portés de
 * `front_externe_batipower/lib/types/hub-partner-stats.ts`. Montants HT.
 */

export type PartnerPriceKind = 'NEGOTIATION' | 'RENEGOTIATION';

export interface PartnerStatsRange {
  startDate?: string;
  endDate?: string;
}

export interface PartnerPricesParams extends PartnerStatsRange {
  page?: number;
  limit?: number;
}

export interface PartnerPaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

/* ─── Opportunités : prix renseignés ─────────────────────────────── */

export interface PartnerEntryGroupSummary {
  key: string;
  label: string;
  proposals: number;
  opportunities: number;
  avgGapPercent: number | null;
  avgProposedPriceHT: number | null;
  successRatePercent: number | null;
}

export interface PartnerOpportunitiesOverview {
  kpis: {
    proposals: number;
    opportunities: number;
    activeUsers: number;
    avgGapPercent: number | null;
    medianGapPercent: number | null;
    avgProposedPriceHT: number | null;
    avgObtainedVsProposedPercent: number | null;
    successRatePercent: number | null;
    belowRequestedCount: number;
    equalRequestedCount: number;
    aboveRequestedCount: number;
  };
  gapDistribution: { key: string; label: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byKind: { kind: PartnerPriceKind; count: number }[];
  byBrand: PartnerEntryGroupSummary[];
  byUser: PartnerEntryGroupSummary[];
  bySubsidiary: PartnerEntryGroupSummary[];
  monthly: { month: string; proposals: number; avgGapPercent: number | null }[];
}

export interface PartnerLatestPriceRow {
  id: string;
  kind: PartnerPriceKind;
  at: string;
  brand: string;
  reference: string | null;
  designation: string | null;
  ean: string | null;
  proposedPriceHT: number;
  requestedPriceHT: number | null;
  currentPriceHT: number | null;
  gapPercent: number | null;
  status: string;
  userId: string;
  userName: string;
  subsidiaryName: string | null;
  distributorName: string | null;
}

/* ─── Hausses / baisses de prix d'achat ──────────────────────────── */

export interface PartnerPriceChangeGroupSummary {
  key: string;
  label: string;
  total: number;
  increases: number;
  decreases: number;
  avgIncreasePercent: number | null;
  avgDecreasePercent: number | null;
  maxIncreasePercent: number | null;
  maxDecreasePercent: number | null;
  avgImpactHT: number | null;
}

export interface PartnerPriceChangesOverview {
  kpis: {
    total: number;
    increases: number;
    decreases: number;
    avgPercent: number | null;
    medianPercent: number | null;
    avgIncreasePercent: number | null;
    avgDecreasePercent: number | null;
    maxIncreasePercent: number | null;
    maxDecreasePercent: number | null;
    brandsConcerned: number;
    activeUsers: number;
  };
  riskDistribution: { riskScore: number; count: number }[];
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
  monthly: {
    month: string;
    increases: number;
    decreases: number;
    avgIncreasePercent: number | null;
    avgDecreasePercent: number | null;
  }[];
}

export interface PartnerPriceChangesByBrand {
  brands: PartnerPriceChangeGroupSummary[];
}

export interface PartnerPriceChangesByUser {
  users: (PartnerPriceChangeGroupSummary & {
    subsidiaryName: string | null;
    distributorName: string | null;
  })[];
  subsidiaries: (PartnerPriceChangeGroupSummary & { distributorName: string | null })[];
}

export interface PartnerLatestPriceChangeRow {
  id: string;
  at: string;
  reference: string;
  designation: string | null;
  brand: string;
  currentFixPriceHT: number | null;
  proposedFixPriceHT: number;
  increasePercent: number;
  riskScore: number;
  status: string;
  source: string;
  effectiveDate: string;
  userId: string;
  userName: string;
  subsidiaryName: string | null;
  distributorName: string | null;
}
