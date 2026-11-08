import type {
  StagingDistributorOfferView,
  SupplierCodeResult,
  SupplierCodeStatus,
  SupplierCodesSearchResponse,
  Warehouse,
} from '@/types/hubProductAnalyzer';

export type SupplierCodeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'muted';

/** Libellé et teinte de chaque statut de recherche. */
export const SUPPLIER_CODE_STATUS_CFG: Record<
  SupplierCodeStatus,
  { label: string; tone: SupplierCodeTone }
> = {
  ATTACHED: { label: 'Rattaché', tone: 'success' },
  ALREADY_SET: { label: 'Code déjà posé', tone: 'neutral' },
  AMBIGUOUS: { label: 'Plusieurs références', tone: 'warning' },
  NOT_FOUND: { label: 'Introuvable', tone: 'muted' },
  CONFLICT: { label: 'Déjà sur un autre produit', tone: 'danger' },
  NO_EBATPRO: { label: 'Sans compte eBatPro', tone: 'muted' },
  ERROR: { label: 'Erreur', tone: 'danger' },
};

/** Clé stable d'une ligne de résultat (un fournisseur, un entrepôt). */
export const supplierRowKey = (r: Pick<SupplierCodeResult, 'distributorId' | 'distributorWarehouseId'>) =>
  `${r.distributorId}|${r.distributorWarehouseId}`;

/**
 * Vue « offre » d'un résultat de recherche : permet de réutiliser les composants de stock par agence
 * (`SupplierStockDetail`) sur les lignes de la recherche.
 */
export function supplierResultToOfferView(r: SupplierCodeResult): StagingDistributorOfferView {
  return {
    uuid: supplierRowKey(r),
    distributorId: r.distributorId,
    distributor: { id: r.distributorId, name: r.distributorName, slug: '' },
    warehouse: (r.warehouse as Warehouse | null) ?? null,
    distributorWarehouseId: r.distributorWarehouseId,
    distributorWarehouse: { id: r.distributorWarehouseId, name: r.warehouseName, code: null, warehouse: r.warehouse },
    distributorCode: r.code ?? null,
    purchasePriceHT: r.purchasePriceHT ?? null,
    stockWarehouse: r.stock.stockWarehouse,
    stockTotal: r.stock.stockTotal,
    stockReadiness: r.stock.readiness,
    agencyStock: { nearby: r.stock.nearby, other: r.stock.other },
    plannedDep: false,
    track: 'STANDARD',
  };
}

/** Résultat local d'une ligne à partir de l'offre relue après un rattachement manuel. */
export function applyOfferToResult(
  row: SupplierCodeResult,
  offers: StagingDistributorOfferView[] | undefined,
  code: string,
): SupplierCodeResult {
  const offer = (offers ?? []).find(
    (o) =>
      o.distributorId === row.distributorId &&
      (o.distributorWarehouseId === row.distributorWarehouseId ||
        (!o.distributorWarehouseId && !!row.warehouse && o.warehouse === row.warehouse)),
  );
  return {
    ...row,
    status: 'ATTACHED',
    code,
    candidates: undefined,
    message: undefined,
    purchasePriceHT: offer?.purchasePriceHT ?? row.purchasePriceHT ?? null,
    stock: offer
      ? {
          stockWarehouse: offer.stockWarehouse ?? null,
          stockTotal: offer.stockTotal ?? null,
          nearby: offer.agencyStock?.nearby ?? [],
          other: offer.agencyStock?.other ?? [],
          readiness: offer.stockReadiness ?? null,
        }
      : row.stock,
  };
}

/** Une offre sans code interne : le produit est candidat à la recherche multi-fournisseurs. */
export function hasOfferWithoutCode(offers: StagingDistributorOfferView[] | undefined): boolean {
  return (offers ?? []).some((o) => !o.distributorCode?.trim());
}

export interface SupplierCodesSummary {
  attached: number;
  alreadySet: number;
  notFound: number;
  ambiguous: number;
  conflict: number;
  noEbatpro: number;
  error: number;
}

export const emptySupplierCodesSummary = (): SupplierCodesSummary => ({
  attached: 0,
  alreadySet: 0,
  notFound: 0,
  ambiguous: 0,
  conflict: 0,
  noEbatpro: 0,
  error: 0,
});

/** Compte les statuts d'une réponse de recherche. */
export function summarizeSupplierResults(res: SupplierCodesSearchResponse): SupplierCodesSummary {
  const out = emptySupplierCodesSummary();
  for (const s of res.suppliers) {
    if (s.status === 'ATTACHED') out.attached += 1;
    else if (s.status === 'ALREADY_SET') out.alreadySet += 1;
    else if (s.status === 'NOT_FOUND') out.notFound += 1;
    else if (s.status === 'AMBIGUOUS') out.ambiguous += 1;
    else if (s.status === 'CONFLICT') out.conflict += 1;
    else if (s.status === 'NO_EBATPRO') out.noEbatpro += 1;
    else out.error += 1;
  }
  return out;
}
