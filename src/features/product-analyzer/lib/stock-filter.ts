import type { StagingFilters } from '@/types/hubProductAnalyzer';

import { SR_CFG } from './constants';

/** Nombre de réglages de stock actifs (même décompte que le web). */
export function stockFilterCount(f: StagingFilters): number {
  return (
    (f.inStock || f.stockReadiness !== '' ? 1 : 0) +
    (f.minStockWh !== '' ? 1 : 0) +
    (f.stockDistributorIds.length > 0 ? 1 : 0)
  );
}

/** « Stock OK · MEQUISA +1 » : libellé du bouton, fournisseurs choisis en suffixe. */
export function stockFilterLabel(f: StagingFilters, supplierNames: string[]): string {
  let base = 'Stock';
  if (f.stockReadiness !== '') base = SR_CFG[f.stockReadiness].label;
  else if (f.inStock) base = 'Stock quelque part';
  else if (f.minStockWh !== '') base = `Entrepôt ≥ ${f.minStockWh}`;
  const first = supplierNames[0];
  if (!first) return base;
  const extra = supplierNames.length > 1 ? ` +${supplierNames.length - 1}` : '';
  return base === 'Stock' ? `Stock · ${first}${extra}` : `${base} · ${first}${extra}`;
}
