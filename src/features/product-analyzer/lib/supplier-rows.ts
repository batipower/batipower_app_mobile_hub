import type { HubDistributor } from '@/api/hubProductAnalyzer';
import type { StagingDistributorOfferView, StockReadiness } from '@/types/hubProductAnalyzer';

/** Une ligne de la carte « Fournisseurs » : une offre (fournisseur + entrepôt) ou un fournisseur sans offre. */
export interface SupplierRow {
  key: string;
  distributorId: string;
  distributorName: string;
  /** Entrepôt, seulement quand il aide à distinguer plusieurs offres du même distributeur. */
  warehouseName: string | null;
  /** Offre source ; null = fournisseur disponible mais sans aucune offre sur ce produit. */
  offer: StagingDistributorOfferView | null;
  code: string | null;
  /** Offre qui porte le code principal du staging. */
  primary: boolean;
  /** Conditionnement : pièces à commander pour 1 unité vendue (1 = pas de conditionnement). */
  multiplier: number;
  saleUnit: string | null;
  salesPackaging: number | null;
  purchasePriceHT: number | null;
  /** PA × conditionnement. */
  effectivePA: number | null;
  stockWarehouse: number | null;
  readiness: StockReadiness | null;
  marginPercent: number | null;
  viabilityStatus: string | null;
  /** Meilleur PA effectif parmi les offres chiffrées (au moins deux pour avoir un sens). */
  bestPrice: boolean;
}

export interface SupplierPrimary {
  /** Code principal du staging (colonne `codeEbat`). */
  codeEbat: string | null | undefined;
  /** Entrepôt eBatPro du code principal. */
  warehouse: string | null | undefined;
}

export type SupplierSortKey = 'default' | 'name' | 'pa' | 'stock' | 'margin';
export type SupplierSortDir = 'asc' | 'desc';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Lignes de la carte « Fournisseurs » : toutes les offres du produit (une par fournisseur et entrepôt) puis,
 * pour chaque distributeur interrogeable via eBatPro sans offre, une ligne « code manquant ».
 */
export function buildSupplierRows(
  offers: StagingDistributorOfferView[] | null | undefined,
  distributors: HubDistributor[] | null | undefined,
  primary: SupplierPrimary,
): SupplierRow[] {
  const list = offers ?? [];
  const rows: SupplierRow[] = list.map((o) => {
    const siblings = list.filter((s) => s.distributorId === o.distributorId).length;
    const multiplier = o.conditioningMultiplier && o.conditioningMultiplier > 1 ? o.conditioningMultiplier : 1;
    const pa = o.purchasePriceHT != null && o.purchasePriceHT > 0 ? o.purchasePriceHT : null;
    const global = o.viability?.global ?? null;
    return {
      key: o.uuid,
      distributorId: o.distributorId,
      distributorName: o.distributor?.name ?? o.warehouse ?? 'Fournisseur',
      warehouseName: siblings > 1 ? (o.distributorWarehouse?.name ?? o.warehouse ?? null) : null,
      offer: o,
      code: o.distributorCode?.trim() || null,
      primary: !!primary.codeEbat && !!o.warehouse && o.warehouse === primary.warehouse,
      multiplier,
      saleUnit: o.saleUnit ?? null,
      salesPackaging: o.salesPackaging ?? null,
      purchasePriceHT: pa,
      effectivePA: pa != null ? round2(pa * multiplier) : null,
      stockWarehouse: o.stockWarehouse ?? null,
      readiness: o.stockReadiness ?? null,
      marginPercent: global?.marginPercent ?? null,
      viabilityStatus: global?.viabilityStatus ?? null,
      bestPrice: false,
    };
  });

  const withOffer = new Set(list.map((o) => o.distributorId));
  for (const d of distributors ?? []) {
    if (!d.ebatproWarehouse || withOffer.has(d.id)) continue;
    rows.push({
      key: `missing:${d.id}`,
      distributorId: d.id,
      distributorName: d.name,
      warehouseName: null,
      offer: null,
      code: null,
      primary: false,
      multiplier: 1,
      saleUnit: null,
      salesPackaging: null,
      purchasePriceHT: null,
      effectivePA: null,
      stockWarehouse: null,
      readiness: null,
      marginPercent: null,
      viabilityStatus: null,
      bestPrice: false,
    });
  }

  const priced = rows.filter((r) => r.effectivePA != null);
  if (priced.length > 1) {
    const min = Math.min(...priced.map((r) => r.effectivePA as number));
    for (const r of priced) r.bestPrice = r.effectivePA === min;
  }
  return sortSupplierRows(rows, 'default', 'desc');
}

const nullsLast = (a: number | null, b: number | null, dir: SupplierSortDir): number => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === 'asc' ? a - b : b - a;
};

/**
 * Tri des lignes. `default` : code posé avant code manquant, puis marge décroissante, puis nom. Les colonnes
 * triées rejettent toujours les valeurs absentes en fin de liste.
 */
export function sortSupplierRows(rows: SupplierRow[], key: SupplierSortKey, dir: SupplierSortDir): SupplierRow[] {
  const byName = (a: SupplierRow, b: SupplierRow) =>
    `${a.distributorName} ${a.warehouseName ?? ''}`.localeCompare(`${b.distributorName} ${b.warehouseName ?? ''}`, 'fr');
  const out = [...rows];
  out.sort((a, b) => {
    switch (key) {
      case 'name':
        return dir === 'asc' ? byName(a, b) : byName(b, a);
      case 'pa':
        return nullsLast(a.effectivePA, b.effectivePA, dir) || byName(a, b);
      case 'stock':
        return nullsLast(a.stockWarehouse, b.stockWarehouse, dir) || byName(a, b);
      case 'margin':
        return nullsLast(a.marginPercent, b.marginPercent, dir) || byName(a, b);
      default: {
        const hasA = a.code ? 0 : 1;
        const hasB = b.code ? 0 : 1;
        if (hasA !== hasB) return hasA - hasB;
        return nullsLast(a.marginPercent, b.marginPercent, 'desc') || byName(a, b);
      }
    }
  });
  return out;
}
