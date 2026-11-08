import type {
  AgencyStockDetail,
  FullResult,
  MarketplaceData,
  StagingItem,
  StagingMpSales,
  ViabilityByCountry,
  ViabilityStatus,
  Warehouse,
  WeightSource,
} from '@/types/hubProductAnalyzer';
import type { BatchCheckItemExt } from './analyze-types';
import { COMMISSIONS, MARGES, REF_COMMISSION_PCT, SERVICE_FEE_PERCENT, VIAB, VIAB_STATUS_CFG } from './constants';

export function agencyDisplayName(a: AgencyStockDetail, mainWarehouse: string): string {
  const code = String(a.code ?? '').trim();
  if (code === '31') {
    if (mainWarehouse === 'FLEVY') return 'Stiring Wendel';
    if (mainWarehouse === 'DOMBASLE') return 'Nancy';
  }
  return a.name;
}

const VIAB_FALLBACK = { min: -Infinity, color: '#EF4444', label: 'Non viable' };

export function getViab(m: number | null, vs?: ViabilityStatus | null): { color: string; label: string } {
  if (vs && VIAB_STATUS_CFG[vs]) return VIAB_STATUS_CFG[vs];
  if (m === null) return VIAB[4] ?? VIAB_FALLBACK;
  return VIAB.find((v) => m >= v.min) ?? VIAB[4] ?? VIAB_FALLBACK;
}

export function getProductIssues(item: StagingItem): string[] {
  const issues: string[] = [];
  const m = item.marginPercent;
  if (m !== null) {
    if (m < -5) issues.push("Marge très négative — prix d'achat bien trop élevé par rapport au prix de vente");
    else if (m < 0) issues.push('Marge négative — les coûts (achat + transport + commission) dépassent le prix de vente');
    else if (m < 3) issues.push('Marge insuffisante (<3%) — trop faible pour couvrir les risques et frais imprévus');
    else if (m < 7) issues.push('Marge fragile — sensible aux variations de coûts transport ou commission Amazon');
  }
  if (!item.asin && item.marginPercent !== null) {
    issues.push('Aucune correspondance ASIN Amazon — produit non listé ou EAN introuvable');
  }
  if (item.recommendedBuyPrice !== null && item.recommendedBuyPrice <= 0) {
    issues.push("Prix d'achat recommandé non calculable — vérifier les données fournisseur");
  }
  if (item.stockReadiness === 'ORDER_NEEDED') {
    issues.push('Aucun stock disponible — commande fournisseur nécessaire avant lancement');
  } else if (item.stockReadiness === 'TRANSFER_OTHER') {
    issues.push('Stock uniquement en agence secondaire — transfert inter-agence classique nécessaire');
  }
  if (item.viabilityStatus === 'NOT_VIABLE') {
    issues.push('Structurellement non viable — même gratuit, les frais dépassent le prix de vente');
  } else if (item.viabilityStatus === 'NEGOTIABLE' && item.negotiationGapHT != null && item.negotiationGapHT > 0) {
    issues.push(`PA trop élevé — négocier ${item.negotiationGapHT.toFixed(2)} € HT de réduction auprès du fournisseur`);
  } else if (item.isViable === false && issues.length === 0) {
    issues.push("Jugé non viable par l'analyse complète");
  }
  return issues;
}

export function isStagingPaConfirmed(item: Pick<StagingItem, 'codeEbat' | 'customerPriceHT'>): boolean {
  return !!item.codeEbat && item.customerPriceHT != null && item.customerPriceHT > 0;
}

/**
 * Référence de la fiche catalogue liée à un staging : la fiche détectée à l'analyse
 * (`existingApproRowsRef`), sinon le code eBat si la ligne a été lancée. `null` sinon.
 */
export function resolveCatalogueRef(
  item: Pick<StagingItem, 'existingApproRowsRef' | 'status' | 'codeEbat'>,
): string | null {
  const existing = item.existingApproRowsRef?.trim();
  if (existing) return existing;
  if (item.status === 'LAUNCHED' && item.codeEbat?.trim()) return item.codeEbat.trim();
  return null;
}

export function readExistingFiche(
  raw?: Record<string, unknown> | null,
): { batipowerId: number | null; reference: string | null } | null {
  if (!raw?.alreadyExistsInSystem) return null;
  return {
    batipowerId: (raw.existingBatipowerId as number | null) ?? (raw.batipowerId as number | null) ?? null,
    reference: (raw.existingApproRowsRef as string | null) ?? null,
  };
}

export function fmtCur(v: number | null | undefined) {
  if (v == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
}

export function fmtNum(v: number | null | undefined) {
  if (v == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(v);
}

export function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}

export function computeCiblesGrid(pvHT: number, carrierCostHT: number): Record<string, number> {
  const k = 1 + SERVICE_FEE_PERCENT / 100;
  const out: Record<string, number> = {};
  for (const c of COMMISSIONS) {
    for (const m of MARGES) {
      const key = m === 0 ? `cible${c}` : `cible${c}_${m}`;
      out[key] = +(pvHT - carrierCostHT - pvHT * ((c / 100) * k) - (m / 100) * pvHT).toFixed(2);
    }
  }
  return out;
}

export function truncateLaunchFromStagingTitle(
  eb: Record<string, unknown> | undefined,
  az: Record<string, unknown> | undefined,
  max = 128,
): string {
  const raw = String((eb?.designation as string) || (az?.title as string) || '').trim();
  return raw.slice(0, max);
}

export function enrichStagingItem(it: Record<string, unknown>): StagingItem {
  const snap = it.fullAnalysisSnapshot as FullResult | null | undefined;
  const eb = snap?.ebatpro as Record<string, unknown> | undefined;
  const tr = snap?.transport as Record<string, unknown> | undefined;
  const az = snap?.amazon as Record<string, unknown> | undefined;
  return {
    ...it,
    buyboxSeller: (it.buyboxSeller as string | null) ?? (az?.buyboxSeller as string | null) ?? null,
    weightGrams:
      (it.weightGrams as number | null) ??
      (eb?.weightGrams as number | null) ??
      (tr?.weightUsed as number | null) ??
      null,
    weightPending: (it.weightPending as boolean) ?? true,
    manomano: (it.manomano as MarketplaceData | null) ?? snap?.manomano ?? null,
    leroyMerlin: (it.leroyMerlin as MarketplaceData | null) ?? snap?.leroyMerlin ?? null,
    castorama: (it.castorama as MarketplaceData | null) ?? snap?.castorama ?? null,
    salesAnalysis:
      (it.salesAnalysis as Record<string, StagingMpSales> | null) ??
      (snap?.salesAnalysis as Record<string, StagingMpSales> | undefined) ??
      null,
    viabilityByCountry: (it.viabilityByCountry as ViabilityByCountry | null) ?? snap?.viabilityByCountry ?? null,
    weightSource: (it.weightSource as WeightSource) ?? (tr?.weightSource as WeightSource) ?? null,
    weightConfidence: (it.weightConfidence as string) ?? (tr?.weightConfidence as string) ?? null,
    weightCrossCheck: (it.weightCrossCheck as Record<string, unknown>) ?? null,
  } as StagingItem;
}

/** Distributeurs dont la DEP est planifiée sur ce staging (une offre `plannedDep` par distributeur). */
export function plannedDepDistributorIds(
  item: Pick<StagingItem, 'distributorOffers'> | null | undefined,
): string[] {
  return (item?.distributorOffers ?? []).filter((o) => o.plannedDep).map((o) => o.distributorId);
}

/**
 * Un staging n'est supprimable que s'il n'a aucune valeur exploitable : jamais lancé, pas une ligne
 * de trace catalogue, ET non viable ou sans aucune information.
 * Doit rester alignée sur `ProductAnalyzerStagingService.isStagingDeletable` (back-api-power).
 */
export function canDeleteStaging(
  item: Pick<StagingItem, 'status' | 'forcedFromCatalogue' | 'viabilityStatus' | 'isViable' | 'marginPercent'>,
): boolean {
  if (item.status === 'LAUNCHED' || item.forcedFromCatalogue) return false;
  if (item.status === 'EBAT_NOT_FOUND') return true;
  if (item.viabilityStatus === 'NOT_VIABLE') return true;
  if (item.viabilityStatus == null && item.isViable === false) return true;
  return item.viabilityStatus == null && item.marginPercent == null;
}

/** Raison lisible pour laquelle un staging n'est pas supprimable (null s'il l'est). */
export function deleteBlockedReason(item: Parameters<typeof canDeleteStaging>[0]): string | null {
  if (canDeleteStaging(item)) return null;
  if (item.status === 'LAUNCHED') return 'Produit déjà lancé';
  if (item.forcedFromCatalogue) return 'Ligne de trace catalogue';
  return 'Seuls les produits non viables ou sans information peuvent être supprimés';
}

/** Paramètres de relance d'analyse déduits d'une ligne staging (code eBat ou EAN, entrepôt, distributeur DEP). */
export interface StagingRerunTarget {
  refType: 'ebatpro' | 'ean';
  code: string;
  warehouse: Warehouse | null;
  distributorId: string | null;
}

/**
 * Détermine comment relancer l'analyse d'un staging. `null` si la ligne n'est pas relançable :
 * produit lancé, ligne de trace catalogue, ou ni code eBat ni EAN.
 */
export function stagingRerunTarget(
  item: Pick<
    StagingItem,
    'status' | 'forcedFromCatalogue' | 'codeEbat' | 'ean' | 'warehouse' | 'plannedDepWarehouse' | 'distributorOffers'
  >,
): StagingRerunTarget | null {
  if (item.status === 'LAUNCHED' || item.forcedFromCatalogue) return null;
  const plannedOffer = item.distributorOffers?.find((o) => o.plannedDep) ?? null;
  const codeEbat = (plannedOffer?.distributorCode || item.codeEbat || '').trim();
  const ean = (item.ean ?? '').trim();
  if (!codeEbat && !ean) return null;
  const wh = plannedOffer?.warehouse ?? item.warehouse;
  const warehouse: Warehouse | null = wh === 'FLEVY' || wh === 'DOMBASLE' || wh === 'NICODEME' ? wh : null;
  return {
    refType: codeEbat ? 'ebatpro' : 'ean',
    code: codeEbat || ean,
    warehouse,
    distributorId: plannedOffer?.distributorId ?? null,
  };
}

/** Item de la vue « prêt à analyser » (étape batch `checked`) pour relancer un staging existant. */
export function stagingToRerunCheckItem(item: StagingItem): BatchCheckItemExt | null {
  const target = stagingRerunTarget(item);
  if (!target) return null;
  return {
    ref: target.code,
    code: target.code,
    warehouse: target.warehouse,
    refType: target.refType,
    distributorId: target.distributorId,
    checkStatus: 'analyzable',
    message: `Relance de l'analyse du ${new Date(item.lastAnalyzedAt ?? item.createdAt).toLocaleDateString('fr-FR')}${
      item.designation ? ` — ${item.designation}` : ''
    }`,
    existingStaging: {
      uuid: item.uuid,
      status: item.status,
      isViable: item.isViable,
      marginPercent: item.marginPercent,
      updatedAt: item.lastAnalyzedAt ?? item.createdAt,
    },
    existingProduct: null,
    selected: true,
  };
}

export interface StagingMarginBreakdown {
  /** `ok` : décomposition complète ; `no_pa` : aucun PA, marge non calculable ; `unavailable` : pas de prix de vente. */
  state: 'ok' | 'no_pa' | 'unavailable';
  pvHT: number | null;
  sourcePriceTTC: number | null;
  vatRate: number | null;
  commissionPct: number;
  commissionEur: number | null;
  transportEur: number | null;
  paUnit: number | null;
  conditioning: number;
  paEffective: number | null;
  marginEur: number | null;
  marginPercent: number | null;
  paConfirmed: boolean;
}

/**
 * Décompose la marge FR affichée dans la liste (même formule que `computeViability` côté API) :
 * marge = prix de vente HT − commission Amazon (15 % × 1,03) − transport HT − PA effectif (PA × conditionnement).
 */
export function computeStagingMarginBreakdown(item: StagingItem): StagingMarginBreakdown {
  const fr = item.viabilityByCountry?.FR;
  const cm =
    (item.warehouse === 'FLEVY' ? item.conditioningMultiplierFlevy : item.conditioningMultiplierDombasle) ?? 1;
  const conditioning = cm > 1 ? cm : 1;
  const commissionPct = +(REF_COMMISSION_PCT * (1 + SERVICE_FEE_PERCENT / 100)).toFixed(2);
  const base: StagingMarginBreakdown = {
    state: 'unavailable',
    pvHT: null,
    sourcePriceTTC: fr?.sourcePriceTTC ?? null,
    vatRate: fr?.vatRate ?? null,
    commissionPct,
    commissionEur: null,
    transportEur: null,
    paUnit: item.customerPriceHT ?? null,
    conditioning,
    paEffective: null,
    marginEur: null,
    marginPercent: item.marginPercent,
    paConfirmed: isStagingPaConfirmed(item),
  };
  if (!fr || !(fr.pvHT > 0)) return base;

  const pvHT = fr.pvHT;
  const transportEur = fr.carrierCostHT ?? 0;
  const commissionEur = +(pvHT * (commissionPct / 100)).toFixed(2);
  if (!(item.customerPriceHT != null && item.customerPriceHT > 0)) {
    return { ...base, state: 'no_pa', pvHT, commissionEur, transportEur };
  }
  const paEffective = +(item.customerPriceHT * conditioning).toFixed(2);
  const marginEur = +(pvHT - commissionEur - transportEur - paEffective).toFixed(2);
  return {
    ...base,
    state: 'ok',
    pvHT,
    commissionEur,
    transportEur,
    paEffective,
    marginEur,
    marginPercent: item.marginPercent ?? +((marginEur / pvHT) * 100).toFixed(2),
  };
}
