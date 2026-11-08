import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import type { NegotiationDialogItem } from '@/features/product-analyzer/lib/negotiation-items';
import {
  summarizeSupplierResults,
  type SupplierCodesSummary,
} from '@/features/product-analyzer/lib/supplier-codes';
import type { SupplierCodesSearchResponse } from '@/types/hubProductAnalyzer';

/** Issue de la recherche multi-fournisseurs d'un produit. */
export interface SupplierCodesSearchOutcome {
  response: SupplierCodesSearchResponse;
  summary: SupplierCodesSummary;
}

type CodeNeedInput = Pick<NegotiationDialogItem, 'status' | 'codeEbat' | 'ean' | 'distributorOffers'>;

/**
 * Produit qui attend encore au moins un code interne : aucun code principal, ou une offre fournisseur
 * sans code. Les produits lancés n'en ont plus besoin.
 */
export function needsInternalCode(it: CodeNeedInput): boolean {
  if (it.status === 'LAUNCHED') return false;
  const offersWithoutCode = (it.distributorOffers ?? []).some((o) => !o.distributorCode?.trim());
  return !it.codeEbat?.trim() || offersWithoutCode;
}

/** Produit à rechercher chez les fournisseurs : un code interne manque et il a un EAN. */
export function isInternalCodeCandidate(it: CodeNeedInput): boolean {
  return needsInternalCode(it) && !!it.ean?.trim();
}

/** Code interne manquant mais pas d'EAN : recherche automatique impossible. */
export function isInternalCodeUnsearchable(it: CodeNeedInput): boolean {
  return needsInternalCode(it) && !it.ean?.trim();
}

/**
 * Cherche le produit par son EAN chez tous les fournisseurs et entrepôts qui ont un compte eBatPro
 * (un seul appel API). Les résultats uniques sont rattachés côté API (code, prix d'achat, stock par agence) ;
 * les résultats multiples reviennent comme candidats pour un choix manuel. Lève une erreur si l'appel échoue.
 */
export async function searchInternalCodesByEan(
  item: Pick<NegotiationDialogItem, 'stagingUuid'>,
  opts: { refreshExisting?: boolean } = {},
): Promise<SupplierCodesSearchOutcome> {
  const response = await hubProductAnalyzerApi.searchSupplierCodes(item.stagingUuid, opts);
  return { response, summary: summarizeSupplierResults(response) };
}
