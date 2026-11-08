import type { StagingItem, ViabilityByCountry } from '@/types/hubProductAnalyzer';

type Rec = Record<string, unknown>;

const rec = (v: unknown): Rec | null => (v && typeof v === 'object' ? (v as Rec) : null);

/** Parties du snapshot d'analyse (`fullAnalysisSnapshot`) d'un produit, toutes optionnelles. */
export type Snapshot = {
  hasSnapshot: boolean;
  eb: Rec | null;
  az: Rec | null;
  tr: Rec | null;
  tg: Rec | null;
  sa: Rec | null;
  sc: Rec | null;
  viabilityByCountry: ViabilityByCountry | null;
};

export function snapshotOf(item: StagingItem): Snapshot {
  const full = item.fullAnalysisSnapshot;
  return {
    hasSnapshot: !!full,
    eb: rec(full?.ebatpro),
    az: rec(full?.amazon),
    tr: rec(full?.transport),
    tg: rec(full?.targets),
    sa: rec(full?.salesAnalysis) ?? (item.salesAnalysis as Rec | null | undefined) ?? null,
    sc: rec(full?.systemStatus),
    viabilityByCountry: full?.viabilityByCountry ?? item.viabilityByCountry ?? null,
  };
}

export const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
export const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
