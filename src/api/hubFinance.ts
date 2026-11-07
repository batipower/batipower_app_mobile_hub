import { apiClient } from '@/api/client';
import type {
  FinanceAnomaliesResponse,
  FinancePnlSnapshotsResponse,
  TeogestEnvironment,
} from '@/types/hubFinance';

type ReadOptions = { signal?: AbortSignal };

type FinanceParams = { year?: number; environment: TeogestEnvironment };

/**
 * Dashboard financier du HUB (`hub-app/finance/pnl/*`, SUPERADMIN), en lecture seule. Pendant
 * mobile de `front_externe_batipower/lib/api/hub-finance.ts` : seuls les calculs déjà enregistrés
 * sont lus. Le recalcul d'un mois (relecture de Teogest, 10 à 25 s) et les charges attendues
 * restent réservés au web.
 */
export const hubFinanceApi = {
  /** Mois de l'exercice et derniers calculs enregistrés (lecture en base, instantanée). */
  snapshots({ year, environment }: FinanceParams, { signal }: ReadOptions = {}) {
    return apiClient.get<FinancePnlSnapshotsResponse>('hub-app/finance/pnl/snapshots', {
      query: { year, environment },
      signal,
    });
  },

  /** Anomalies de l'exercice, calculées sur les calculs enregistrés (base seule). */
  anomalies({ year, environment }: FinanceParams, { signal }: ReadOptions = {}) {
    return apiClient.get<FinanceAnomaliesResponse>('hub-app/finance/pnl/anomalies', {
      query: { year, environment },
      signal,
    });
  },
};
