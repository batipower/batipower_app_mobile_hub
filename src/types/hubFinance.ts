/**
 * Vue « Financier » de l'accueil HUB : estimations internes contre comptabilité Teogest, portée de
 * `front_externe_batipower/lib/types/hub-finance.ts` (lecture seule). Montants en centimes HT.
 */

export type TeogestEnvironment = 'prod' | 'test';

export type PnlLineId =
  | 'revenue'
  | 'purchases'
  | 'transport'
  | 'commissions'
  | 'externalCharges'
  | 'taxes'
  | 'payroll'
  | 'financialAndOtherCharges'
  | 'otherIncome';

export interface PnlLine {
  id: PnlLineId;
  label: string;
  kind: 'income' | 'expense';
  /** Montant prévu (nos chiffres) ; null si la ligne n'a pas d'équivalent interne. */
  forecastCents: number | null;
  /** Montant comptabilisé dans Teogest. */
  accountingCents: number;
  /** Teogest − prévu ; null sans montant prévu. */
  gapCents: number | null;
  gapPct: number | null;
}

export interface PnlAmounts {
  forecastCents: number;
  accountingCents: number;
  gapCents: number;
  gapPct: number | null;
}

/** Base des autres charges nettes du résultat estimé. */
export type PnlEstimatedBasis = 'month' | 'average3' | 'none';

export interface PnlResult {
  accountingCents: number;
  estimatedCents: number;
  gapCents: number;
  estimatedBasis: PnlEstimatedBasis;
  otherNetChargesCents: number;
  baselineMonths: number;
}

export interface FinancePnlMonthResponse {
  environment: TeogestEnvironment;
  codeClient: string;
  period: string;
  year: number;
  month: number;
  isCurrentMonth: boolean;
  computedAt: string;
  cached: boolean;
  internal: { orders: number; invoices: number; slips: number };
  lines: PnlLine[];
  margin: PnlAmounts;
  result: PnlResult;
}

export interface TeogestEnvironmentOption {
  id: TeogestEnvironment;
  label: string;
  configured: boolean;
  codeClient: string | null;
}

/** Mois de l'exercice et derniers calculs enregistrés (un par mois déjà calculé). */
export interface FinancePnlSnapshotsResponse {
  year: number;
  years: number[];
  environment: TeogestEnvironment;
  environments: TeogestEnvironmentOption[];
  months: { month: number; period: string; label: string; isCurrent: boolean }[];
  snapshots: FinancePnlMonthResponse[];
}

export type FinanceAnomalyType =
  'missing' | 'partial' | 'excess' | 'month_not_entered' | 'not_computed';
export type FinanceAnomalySeverity = 'high' | 'medium' | 'low';

export interface FinanceAnomaly {
  id: string;
  month: number;
  type: FinanceAnomalyType;
  severity: FinanceAnomalySeverity;
  source: 'auto' | 'config';
  key: string;
  label: string;
  expectedCents: number | null;
  actualCents: number;
  detail: string;
  expectedChargeId?: string;
}

export interface FinanceAnomaliesResponse {
  year: number;
  environment: TeogestEnvironment;
  evaluatedAt: string;
  anomalies: FinanceAnomaly[];
  notComputedMonths: number[];
  legacyMonths: number[];
  expectedChargesCount: number;
}
