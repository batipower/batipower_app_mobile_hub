import {
  getApproRowsBatchByReferences,
  getPrestaShopCustomer,
  getPrestaShopProductsActiveStatus,
  getQuote,
  getQuoteAddress,
  resolveProductByReference,
} from '@/api/hubCustomerQuotes';

import { newLineKey } from '../lib/line-key';
import type { LineRow } from '../lib/line-types';
import { bestWarehouseEcotaxHT, normalizeTaxRate } from '../lib/quote-math';
import { emptyCustomerDraft } from '../lib/quote-payload';
import type { QuoteEditorState } from './editorState';

export type LoadQuoteDeps = {
  patch: (payload: Partial<QuoteEditorState>) => void;
  setLines: (updater: LineRow[] | ((prev: LineRow[]) => LineRow[])) => void;
  /** Un devis dont la reco GLS est enregistrée : sa signature est reposée une fois les poids connus. */
  recoRestorePending: { current: boolean };
  /** Tant que vrai, un changement de signature transport n'invalide pas la validation du transport. */
  transportRestorePending: { current: boolean };
  lastTransportSignatureRef: { current: string | null };
};

const isPlaceholder = (value?: string) => {
  if (!value) return true;
  const text = value.trim();
  return !text || text === '—' || text === 'Adresse à compléter' || text === '00000';
};

/**
 * Hydratation d'un devis existant (`GET quotes/:id`), portée depuis `useQuoteLoader` du web :
 * client (PrestaShop ou prospect), lignes, transport, remise, notes, proposition IA enregistrée,
 * puis enrichissement catalogue (miniatures, poids, PA, écotaxe, colis), statut PrestaShop des
 * produits, liaison automatique des lignes non liées et adresse du devis.
 *
 * Résout une fois le devis et l'enrichissement catalogue chargés ; le reste est non bloquant.
 */
export async function loadQuoteInto(id: string, deps: LoadQuoteDeps): Promise<void> {
  const { patch, setLines, recoRestorePending, transportRestorePending, lastTransportSignatureRef } = deps;

  transportRestorePending.current = true;
  lastTransportSignatureRef.current = null;

  const q = await getQuote(id);
  const next: Partial<QuoteEditorState> = {
    quoteId: q.id,
    quoteReference: q.reference || null,
    quoteFulfillment: {
      mode: q.fulfillmentMode ?? null,
      warehouse: q.fulfillmentWarehouse ?? null,
      ebatOrderNumber: q.ebatOrderNumber ?? null,
      ebatOrderError: q.ebatOrderError ?? null,
    },
    quoteStatus: (q.status || 'BROUILLON').toUpperCase(),
    prestashopOrderRef: q.prestashopOrderRef ?? null,
    prestashopOrderId: q.prestashopOrderId ?? null,
    currentRevision: q.currentRevision ?? 0,
    revisionDraftOpen: q.revisionDraftOpen === true,
    revisionsEnforced: q.revisionsEnforced === true,
    selectedCustomer: null,
    draft: emptyCustomerDraft(),
    customerMissingPs: false,
    quoteAddressDisplay: null,
    pickedProspect: null,
  };

  if (q.customerPrestashopId != null) {
    next.clientMode = 'prestashop';
    try {
      next.selectedCustomer = await getPrestaShopCustomer(q.customerPrestashopId);
    } catch {
      next.customerMissingPs = true;
      next.selectedCustomer = { id: q.customerPrestashopId };
    }
  } else if (q.customerDraft) {
    next.clientMode = 'prospect';
    const d = { ...emptyCustomerDraft(), ...q.customerDraft, country: q.customerDraft.country || 'FR' };
    // Valeurs de remplissage acceptées par le back pour un prospect partiel (comme le web).
    if (d.email && !d.firstname) d.firstname = 'Prénom';
    if (d.email && !d.lastname) d.lastname = 'Nom';
    if (d.email && !d.phone) d.phone = '0600000000';
    if (d.email && !d.address1) d.address1 = 'Adresse à compléter';
    if (d.email && !d.city) d.city = 'Ville';
    if (d.email && !d.postcode) d.postcode = '00000';
    next.draft = d;
  } else {
    next.clientMode = 'prestashop';
  }

  const parsedLines: LineRow[] = (q.lines ?? []).map((L) => {
    const lineType = L.lineType ?? 'product';
    if (lineType === 'title' || lineType === 'text') {
      return {
        key: newLineKey(),
        lineType,
        content: L.content ?? '',
        reference: '',
        quantity: 0,
        unitPriceHT: 0,
        catalogPriceTTC: 0,
        discountPct: 0,
        taxRate: 0.2,
      };
    }
    const tr = normalizeTaxRate(L.taxRate ?? 0.2);
    const disc = L.lineDiscountPercent ?? 0;
    const effectiveHT = L.effectiveUnitPriceHT ?? L.unitPriceHT * (1 - disc / 100);
    const catalogHT = L.catalogPriceHT ?? L.unitPriceHT;
    const catalogTTC = catalogHT * (1 + tr);
    const baseTTC = L.baseCatalogPriceHT != null ? L.baseCatalogPriceHT * (1 + tr) : undefined;
    const purchase = L.purchasePriceHT;
    const negotiated = L.proposedPurchasePriceHT;
    const eco = L.ecotaxHT;
    return {
      key: newLineKey(),
      lineType: 'product' as const,
      note: L.note ?? undefined,
      reference: L.reference,
      quantity: L.quantity,
      unitPriceHT: effectiveHT,
      catalogPriceTTC: catalogTTC,
      baseCatalogPriceTTC: baseTTC && baseTTC > catalogTTC ? baseTTC : undefined,
      discountPct: disc,
      productLabel: L.productLabel,
      taxRate: tr,
      prestashopProductId: L.prestashopProductId,
      imageUrl: L.imageUrl,
      weightInGrams: null,
      nbColisLine: L.nbColisLine ?? undefined,
      nbColisLineManual: L.nbColisLine != null,
      priceMode: (L.priceMode as LineRow['priceMode']) ?? undefined,
      costHT: purchase != null && purchase > 0 ? purchase : null,
      negotiatedCostHT: negotiated != null && negotiated > 0 ? negotiated : null,
      ecotaxHT: eco != null && eco >= 0 ? eco : null,
    };
  });

  next.persistedTotals = {
    totalHT: q.totalHT,
    totalTTC: q.totalTTC,
    totalCatalogCostHT: q.totalCatalogCostHT,
    totalCostHT: q.totalCostHT,
    totalWeeeTaxHT: q.totalWeeeTaxHT,
    shippingCostHT: q.shippingCostHT,
    totalMarginHT: q.totalMarginHT,
    totalMarginPct: q.totalMarginPct,
  };
  next.weeeTaxHT = q.totalWeeeTaxHT ?? 0;

  if (q.aiProposalSnapshot) {
    next.pricingProposal = q.aiProposalSnapshot;
    next.showPricingPanel = true;
    next.pricingGeneratedAt = q.aiProposalGeneratedAt ? new Date(q.aiProposalGeneratedAt) : null;
  } else {
    next.pricingProposal = null;
    next.showPricingPanel = false;
    next.pricingGeneratedAt = null;
  }

  next.shippingFeeHT = q.shippingFeeHT ?? 0;
  next.shippingFeeOffered = q.shippingFeeOffered ?? false;
  next.supplierShippingOffered = q.supplierShippingOffered ?? false;
  next.transportChecked = !!q.transportConfirmed;
  if (q.shippingCostHT != null && q.shippingCostHT > 0) {
    next.recommendedShippingHT = q.shippingCostHT;
    next.recommendedShippingError = null;
    next.recoSignature = null;
    recoRestorePending.current = true;
  } else {
    next.recommendedShippingHT = null;
    next.recoSignature = null;
    recoRestorePending.current = false;
    // Laisse deux images pour que la signature initiale soit posée avant d'armer l'invalidation.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lastTransportSignatureRef.current = null;
        transportRestorePending.current = false;
      });
    });
  }
  next.nbColisOverride =
    q.nbColis != null && Number.isFinite(q.nbColis) && q.nbColis >= 1 ? Math.floor(q.nbColis) : null;
  next.globalDiscountLabel = q.globalDiscountLabel ?? '';
  if (q.globalDiscountType) next.globalDiscountType = q.globalDiscountType;
  next.globalDiscountValue = q.globalDiscountValue ?? 0;
  next.internalNotes = q.internalNotes ?? '';
  next.customerNotes = q.customerNotes ?? '';
  next.quoteDeliveryAddressId = q.deliveryAddressId ?? undefined;
  next.quoteInvoiceAddressId = q.invoiceAddressId ?? undefined;

  patch(next);
  setLines(parsedLines);

  const refs = parsedLines.map((l) => l.reference).filter(Boolean);
  if (refs.length > 0) {
    try {
      const batch = await getApproRowsBatchByReferences(refs);
      setLines((prev) =>
        prev.map((l) => {
          const row = batch.data[l.reference];
          const npc = row?.nbPieceByColis ?? null;
          const defaultColis = Math.max(1, Math.ceil(l.quantity / (npc || 1)));
          return {
            ...l,
            imageUrl: row?.thumbnailBase64 && !l.imageUrl ? row.thumbnailBase64 : l.imageUrl,
            weightInGrams: row?.weightInGrams ?? null,
            packageLengthCm: row?.packageLengthCm ?? null,
            packageWidthCm: row?.packageWidthCm ?? null,
            packageHeightCm: row?.packageHeightCm ?? null,
            codeFlevy: row?.codeFlevy || null,
            codeDombasle: row?.codeDombasle || null,
            costHT: l.costHT != null && l.costHT > 0 ? l.costHT : (row?.fixPriceHT ?? null),
            ecotaxHT: l.ecotaxHT != null ? l.ecotaxHT : bestWarehouseEcotaxHT(row),
            nbPieceByColis: npc,
            nbColisLine: l.nbColisLine != null ? l.nbColisLine : defaultColis,
            nbColisLineManual: l.nbColisLine != null && l.nbColisLine !== defaultColis,
          };
        }),
      );
    } catch {
      // Miniatures et poids indisponibles : pas bloquant.
    }

    getPrestaShopProductsActiveStatus(refs)
      .then((statusMap) => {
        setLines((prev) =>
          prev.map((l) => {
            const status = statusMap[l.reference];
            return status != null ? { ...l, active: status.active } : l;
          }),
        );
      })
      .catch(() => undefined);
  }

  // Liaison silencieuse des lignes produit sans `prestashopProductId` (persistée par l'auto-save).
  const unlinked = parsedLines.filter(
    (l) => (l.lineType ?? 'product') === 'product' && !l.prestashopProductId && l.reference.trim().length > 0,
  );
  if (unlinked.length > 0) {
    void (async () => {
      const CONCURRENCY = 4;
      for (let i = 0; i < unlinked.length; i += CONCURRENCY) {
        await Promise.all(
          unlinked.slice(i, i + CONCURRENCY).map(async (l) => {
            try {
              const res = await resolveProductByReference(l.reference);
              if (res.prestashopProductId) {
                setLines((prev) =>
                  prev.map((x) =>
                    x.key === l.key && !x.prestashopProductId
                      ? { ...x, prestashopProductId: res.prestashopProductId }
                      : x,
                  ),
                );
              }
            } catch {
              // Silencieux : la ligne reste « non liée » (alerte de conversion).
            }
          }),
        );
      }
    })();
  }

  if (q.customerPrestashopId != null) {
    try {
      const addr = await getQuoteAddress(id);
      if (!isPlaceholder(addr.address1) || !isPlaceholder(addr.city)) {
        const parts = [
          addr.address1?.trim(),
          [addr.postcode?.trim(), addr.city?.trim()].filter(Boolean).join(' '),
        ].filter((p) => p && p.length > 0);
        patch({ quoteAddressDisplay: parts.join(' · ') });
      }
    } catch {
      patch({ quoteAddressDisplay: null });
    }
  }
}
