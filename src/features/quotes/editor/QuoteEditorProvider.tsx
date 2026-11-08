import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import {
  cancelQuoteRevisionDraft,
  createPrestashopOrderFromQuote,
  createPsCustomerFromQuote,
  createQuote,
  getApproRowsBatchByReferences,
  getGlsShippingCostHT,
  getPrestaShopCustomer,
  proposeQuotePricing,
  resolveProductByReference,
  saveAiProposalSnapshot,
  startQuoteRevision,
  updateQuote,
} from '@/api/hubCustomerQuotes';
import { errorMessage } from '@/features/preparation/components/ListState';
import type {
  CreateOrUpdateQuotePayload,
  PrestaCustomerHit,
  PrestaProductSearchHit,
  QuoteCustomerDraft,
  QuoteFulfillment,
  QuoteFulfillmentWarehouse,
  QuotePricingProposalItem,
  QuotePricingProposalLine,
  QuoteProspectHit,
} from '@/types/hubCustomerQuotes';

import { QUOTES_ROOT_KEY } from '../queryKeys';
import { isQuoteReadOnly } from '../pipeline';
import { blankTextLine, newLineKey } from '../lib/line-key';
import type { LineRow } from '../lib/line-types';
import { bestWarehouseEcotaxHT, normalizeTaxRate, round2 } from '../lib/quote-math';
import { buildQuotePayload, emptyCustomerDraft } from '../lib/quote-payload';
import { computeQuoteSnapshotKey } from '../lib/quote-snapshot';
import {
  computeGlsOutOfScopeLines,
  computeHasGlsOutOfScope,
  computeHasZeroPriceLine,
  computeMissingCatalogLines,
  computeRecoSignature,
  computeTotals,
  computeTransportSignature,
  computeWeightPerParcel,
  computeWeightSummary,
  type QuoteTotals,
  type WeightSummary,
} from '../lib/quote-totals';
import {
  createInitialQuoteEditorState,
  quoteEditorReducer,
  type QuoteEditorState,
} from './editorState';
import { loadQuoteInto } from './loadQuote';

export const NEW_QUOTE_ROUTE_ID = 'nouveau';

export type QuoteEditorDerived = {
  totals: QuoteTotals;
  weightSummary: WeightSummary;
  weightPerParcel: number;
  glsOutOfScopeLines: LineRow[];
  hasGlsOutOfScope: boolean;
  hasZeroPriceLine: boolean;
  missingCatalogLines: LineRow[];
  currentRecoSignature: string;
  isRecoStale: boolean;
  transportSignature: string;
  /** Statut qui interdit l'édition (envoyé, accepté, converti, annulé…). */
  isLocked: boolean;
  readOnly: boolean;
  /** IA requise avant envoi ou acceptation, comme sur le web. */
  pricingActive: boolean;
  /** Raisons pour lesquelles l'envoi du devis est bloqué (vide : envoi possible). */
  sendBlockers: string[];
};

type PricingState = { busy: boolean; error: string | null };

export type QuoteEditorContextValue = {
  state: QuoteEditorState;
  derived: QuoteEditorDerived;
  patch: (payload: Partial<QuoteEditorState>) => void;
  setLines: (payload: LineRow[] | ((prev: LineRow[]) => LineRow[])) => void;

  /** Enregistre le devis (création ou mise à jour). `silent` : aucun toast de validation. */
  saveQuote: (opts?: { silent?: boolean }) => Promise<boolean>;
  /** Recharge le devis depuis le serveur (après une action serveur : annulation, refus, envoi…). */
  reload: () => Promise<void>;
  getCurrentPayload: () => CreateOrUpdateQuotePayload;
  markQuoteStatus: (status: 'ENVOYE' | 'ACCEPTE' | 'BROUILLON') => Promise<void>;
  convertToOrder: (fulfillment: QuoteFulfillment, warehouse?: QuoteFulfillmentWarehouse) => Promise<boolean>;
  startRevision: (reason?: string) => Promise<void>;
  cancelRevision: () => Promise<void>;

  // Lignes
  addProductFromHit: (hit: PrestaProductSearchHit) => Promise<void>;
  addProductByReference: (reference: string, quantity: number) => Promise<void>;
  addTextLine: (type: 'title' | 'text', content: string) => void;
  removeLine: (key: string) => void;
  updateLine: (key: string, changes: Partial<LineRow>) => void;
  setLineQuantity: (key: string, quantity: number) => void;
  moveLine: (key: string, direction: -1 | 1) => void;

  // Transport
  recommendedShippingLoading: boolean;
  runGlsRecommendation: () => Promise<void>;
  applyRecommendedToFee: () => Promise<void>;

  // IA
  pricing: PricingState;
  proposePricing: () => Promise<boolean>;

  // Client
  pickCustomer: (hit: Pick<PrestaCustomerHit, 'id'>) => Promise<void>;
  pickProspect: (hit: QuoteProspectHit) => Promise<void>;
  setDraft: (changes: Partial<QuoteCustomerDraft>) => void;
  setClientMode: (mode: 'prestashop' | 'prospect') => void;
  createPsCustomer: () => Promise<void>;
};

const QuoteEditorContext = createContext<QuoteEditorContextValue | null>(null);

type ProviderProps = {
  /** `nouveau` ou l'identifiant du devis (segment dynamique `[id]` de la route). */
  routeId: string;
  children: ReactNode;
};

/**
 * Éditeur de devis partagé par l'écran et ses feuilles (client, ligne, transport, envoi…).
 * Porte ensemble, comme `QuoteEditorProvider` + hooks du web : l'état (`useReducer`), les valeurs
 * dérivées (totaux, alertes, verrouillage), le chargement, l'enregistrement automatique avec
 * garde anti-chevauchement, et les actions (lignes, transport GLS, proposition IA, client,
 * statut, versions, conversion en commande).
 */
export function QuoteEditorProvider({ routeId, children }: ProviderProps) {
  const isNew = routeId === NEW_QUOTE_ROUTE_ID;
  const urlQuoteId = isNew ? null : routeId;
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(quoteEditorReducer, isNew, createInitialQuoteEditorState);
  const [recommendedShippingLoading, setRecommendedShippingLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingState>({ busy: false, error: null });

  const patch = useCallback((payload: Partial<QuoteEditorState>) => dispatch({ type: 'PATCH', payload }), []);
  const setLines = useCallback(
    (payload: LineRow[] | ((prev: LineRow[]) => LineRow[])) => dispatch({ type: 'SET_LINES', payload }),
    [],
  );

  // ─── Valeurs dérivées ──────────────────────────────────────────────────────

  const derived = useMemo<QuoteEditorDerived>(() => {
    const totals = computeTotals({
      lines: state.lines,
      globalDiscountType: state.globalDiscountType,
      globalDiscountValue: state.globalDiscountValue,
      shippingFeeHT: state.shippingFeeHT,
      shippingFeeOffered: state.shippingFeeOffered,
    });
    const weightSummary = computeWeightSummary(state.lines);
    const weightPerParcel = computeWeightPerParcel(weightSummary.totalWeightGrams, state.nbColis);
    const glsOutOfScopeLines = computeGlsOutOfScopeLines(state.lines);
    const hasGlsOutOfScope = computeHasGlsOutOfScope(state.lines, weightPerParcel);
    const hasZeroPriceLine = computeHasZeroPriceLine(state.lines);
    const missingCatalogLines = computeMissingCatalogLines(state.lines);
    const currentRecoSignature = computeRecoSignature(
      weightSummary.totalWeightGrams,
      state.nbColis,
      weightSummary.linesMissingWeight,
    );
    const isRecoStale = state.recoSignature != null && state.recoSignature !== currentRecoSignature;
    const transportSignature = computeTransportSignature({
      totalWeightGrams: weightSummary.totalWeightGrams,
      nbColis: state.nbColis,
      shippingFeeHT: state.shippingFeeHT,
      shippingFeeOffered: state.shippingFeeOffered,
      supplierShippingOffered: state.supplierShippingOffered,
      recoSignature: state.recoSignature,
    });
    const status = state.quoteStatus;
    const isLocked = isQuoteReadOnly({
      status,
      revisionsEnforced: state.revisionsEnforced,
      revisionDraftOpen: false,
    });
    const readOnly = isQuoteReadOnly({
      status,
      revisionsEnforced: state.revisionsEnforced,
      revisionDraftOpen: state.revisionDraftOpen,
    });
    const pricingActive = state.showPricingPanel && !!state.pricingProposal;

    const sendBlockers: string[] = [];
    if (!pricingActive) sendBlockers.push("Lancez d'abord la proposition intelligente (IA).");
    if (!state.transportChecked) sendBlockers.push('Confirmez le transport avant d’envoyer le devis.');
    if (hasGlsOutOfScope) {
      sendBlockers.push(
        `${Math.max(glsOutOfScopeLines.length, 1)} ligne(s) hors périmètre GLS : corrigez avant d’envoyer.`,
      );
    }
    if (hasZeroPriceLine) sendBlockers.push('Une ligne a un prix de vente à 0 : corrigez avant d’envoyer.');

    return {
      totals,
      weightSummary,
      weightPerParcel,
      glsOutOfScopeLines,
      hasGlsOutOfScope,
      hasZeroPriceLine,
      missingCatalogLines,
      currentRecoSignature,
      isRecoStale,
      transportSignature,
      isLocked,
      readOnly,
      pricingActive,
      sendBlockers,
    };
  }, [state]);

  // Dernier état connu, lu par les actions asynchrones (pas de fermeture périmée).
  const stateRef = useRef(state);
  const derivedRef = useRef(derived);
  useLayoutEffect(() => {
    stateRef.current = state;
    derivedRef.current = derived;
  });

  const snapshotKey = useMemo(
    () =>
      computeQuoteSnapshotKey({
        lines: state.lines,
        shippingFeeHT: state.shippingFeeHT,
        shippingFeeOffered: state.shippingFeeOffered,
        supplierShippingOffered: state.supplierShippingOffered,
        transportChecked: state.transportChecked,
        globalDiscountLabel: state.globalDiscountLabel,
        globalDiscountType: state.globalDiscountType,
        globalDiscountValue: state.globalDiscountValue,
        internalNotes: state.internalNotes,
        customerNotes: state.customerNotes,
        nbColisOverride: state.nbColisOverride,
        recommendedShippingHT: state.recommendedShippingHT,
        weeeTaxHT: state.weeeTaxHT,
      }),
    [
      state.lines,
      state.shippingFeeHT,
      state.shippingFeeOffered,
      state.supplierShippingOffered,
      state.transportChecked,
      state.globalDiscountLabel,
      state.globalDiscountType,
      state.globalDiscountValue,
      state.internalNotes,
      state.customerNotes,
      state.nbColisOverride,
      state.recommendedShippingHT,
      state.weeeTaxHT,
    ],
  );
  const snapshotKeyRef = useRef(snapshotKey);
  useLayoutEffect(() => {
    snapshotKeyRef.current = snapshotKey;
  });

  const invalidateLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUOTES_ROOT_KEY });
  }, [queryClient]);

  // ─── Chargement ────────────────────────────────────────────────────────────

  const recoRestorePending = useRef(false);
  const transportRestorePending = useRef(false);
  const lastTransportSignatureRef = useRef<string | null>(null);
  /** Après un chargement, la référence d'auto-save est reposée sur l'état enrichi (pas de sauvegarde fantôme). */
  const baselinePending = useRef(false);
  const persistedSnapshotRef = useRef<string | null>(null);

  const loadQuote = useCallback(
    async (id: string) => {
      patch({ busy: true });
      try {
        await loadQuoteInto(id, {
          patch,
          setLines,
          recoRestorePending,
          transportRestorePending,
          lastTransportSignatureRef,
        });
        baselinePending.current = true;
        patch({ loadError: null });
      } catch (e) {
        patch({ loadError: errorMessage(e, 'Impossible de charger le devis') });
        throw e;
      } finally {
        patch({ busy: false });
      }
    },
    [patch, setLines],
  );

  const reload = useCallback(async () => {
    const id = stateRef.current.quoteId ?? urlQuoteId;
    if (!id) return;
    try {
      await loadQuote(id);
    } catch (e) {
      toast.error(errorMessage(e, 'Impossible de recharger le devis'));
    }
  }, [loadQuote, urlQuoteId]);

  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!urlQuoteId) {
      patch({ isInitialLoading: false });
      return;
    }
    if (loadedFor.current === urlQuoteId) return;
    loadedFor.current = urlQuoteId;
    patch({ isInitialLoading: true });
    loadQuote(urlQuoteId)
      .catch(() => undefined)
      .finally(() => patch({ isInitialLoading: false }));
  }, [urlQuoteId, loadQuote, patch]);

  // ─── Enregistrement ────────────────────────────────────────────────────────

  const getCurrentPayload = useCallback((): CreateOrUpdateQuotePayload => {
    const s = stateRef.current;
    return buildQuotePayload({
      lines: s.lines,
      quoteStatus: s.quoteStatus,
      internalNotes: s.internalNotes,
      customerNotes: s.customerNotes,
      shippingFeeHT: s.shippingFeeHT,
      shippingFeeOffered: s.shippingFeeOffered,
      supplierShippingOffered: s.supplierShippingOffered,
      recommendedShippingHT: s.recommendedShippingHT,
      isRecoStale: derivedRef.current.isRecoStale,
      globalDiscountLabel: s.globalDiscountLabel,
      globalDiscountType: s.globalDiscountType,
      globalDiscountValue: s.globalDiscountValue,
      weeeTaxHT: s.weeeTaxHT,
      nbColisOverride: s.nbColisOverride,
      transportChecked: s.transportChecked,
      clientMode: s.clientMode,
      selectedCustomer: s.selectedCustomer,
      draft: s.draft,
      quoteDeliveryAddressId: s.quoteDeliveryAddressId,
      quoteInvoiceAddressId: s.quoteInvoiceAddressId,
    });
  }, []);

  const validateForSave = useCallback((): string | null => {
    const s = stateRef.current;
    if (s.lines.length === 0) return 'Ajoutez au moins une ligne au devis.';
    if (s.clientMode === 'prestashop' && !s.selectedCustomer) {
      return 'Sélectionnez un client PrestaShop ou passez en « Pas encore client ».';
    }
    if (s.clientMode === 'prospect') {
      if (!s.draft.email?.trim()) return "Pour un prospect, l'e-mail est obligatoire.";
      if (!s.draft.firstname?.trim()) return 'Le prénom du prospect est obligatoire.';
      if (!s.draft.lastname?.trim()) return 'Le nom du prospect est obligatoire.';
    }
    return null;
  }, []);

  const saveInFlight = useRef(false);
  const pendingSave = useRef(false);
  const inflightPromise = useRef<Promise<boolean> | null>(null);
  const saveQuoteRef = useRef<(opts?: { silent?: boolean }) => Promise<boolean>>(async () => false);

  const saveQuote = useCallback(
    async (opts: { silent?: boolean } = {}): Promise<boolean> => {
      const silent = !!opts.silent;
      if (saveInFlight.current) {
        if (silent) {
          pendingSave.current = true;
          return false;
        }
        await inflightPromise.current?.catch(() => false);
      }
      const invalid = validateForSave();
      if (invalid) {
        if (!silent) toast.error(invalid);
        return false;
      }
      saveInFlight.current = true;
      if (!silent) patch({ busy: true });
      const snapshotAtStart = snapshotKeyRef.current;
      const run = (async () => {
        try {
          const payload = getCurrentPayload();
          const id = stateRef.current.quoteId;
          if (id) {
            const totals = await updateQuote(id, payload);
            patch({ persistedTotals: totals });
          } else {
            const { id: createdId, reference } = await createQuote(payload);
            patch({ quoteId: createdId, quoteReference: reference || null });
            invalidateLists();
          }
          patch({ savedAt: new Date(), dirty: false });
          persistedSnapshotRef.current = snapshotAtStart;
          return true;
        } catch (e) {
          toast.error(errorMessage(e, 'Enregistrement impossible'));
          return false;
        } finally {
          if (!silent) patch({ busy: false });
          saveInFlight.current = false;
          inflightPromise.current = null;
          if (pendingSave.current) {
            pendingSave.current = false;
            setTimeout(() => void saveQuoteRef.current({ silent: true }), 0);
          }
        }
      })();
      inflightPromise.current = run;
      return run;
    },
    [validateForSave, getCurrentPayload, patch, invalidateLists],
  );
  useLayoutEffect(() => {
    saveQuoteRef.current = saveQuote;
  });

  // Enregistrement automatique ~1,2 s après la dernière modification (le téléphone se verrouille,
  // l'app passe en arrière-plan : on ne compte pas sur un bouton « Enregistrer »).
  const { isInitialLoading, quoteId: currentQuoteId, dirty } = state;
  const hasLines = state.lines.length > 0;
  const readOnly = derived.readOnly;
  useEffect(() => {
    if (isInitialLoading || readOnly) return;
    if (baselinePending.current) {
      baselinePending.current = false;
      persistedSnapshotRef.current = snapshotKey;
      if (dirty) patch({ dirty: false });
      return;
    }
    if (!hasLines) return;
    if (persistedSnapshotRef.current === null) {
      if (currentQuoteId) {
        persistedSnapshotRef.current = snapshotKey;
        return;
      }
      // Nouveau devis : première sauvegarde (création) dès que le devis est valide.
    } else if (persistedSnapshotRef.current === snapshotKey) {
      if (dirty) patch({ dirty: false });
      return;
    }
    if (!dirty) patch({ dirty: true });
    const timer = setTimeout(() => void saveQuoteRef.current({ silent: true }), 1200);
    return () => clearTimeout(timer);
  }, [snapshotKey, isInitialLoading, readOnly, hasLines, currentQuoteId, dirty, patch]);

  // Liaison produit PrestaShop d'un devis verrouillé : persistée même sans auto-save global.
  const linkKey = useMemo(
    () =>
      state.lines
        .map((L) =>
          (L.lineType ?? 'product') === 'product' && L.prestashopProductId != null
            ? String(L.prestashopProductId)
            : '',
        )
        .join('|'),
    [state.lines],
  );
  const persistedLinkKey = useRef<string | null>(null);
  useEffect(() => {
    if (isInitialLoading || !currentQuoteId) return;
    if (!readOnly || persistedLinkKey.current === null) {
      persistedLinkKey.current = linkKey;
      return;
    }
    if (persistedLinkKey.current === linkKey) return;
    persistedLinkKey.current = linkKey;
    void saveQuoteRef.current({ silent: true });
  }, [linkKey, readOnly, isInitialLoading, currentQuoteId]);

  // Sauvegarde de sécurité : passage en arrière-plan et fermeture de l'écran.
  const dirtyRef = useRef(dirty);
  useLayoutEffect(() => {
    dirtyRef.current = dirty;
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active' && dirtyRef.current) void saveQuoteRef.current({ silent: true });
    });
    return () => {
      subscription.remove();
      if (dirtyRef.current) void saveQuoteRef.current({ silent: true });
      // Le pipeline reflète les montants et statuts modifiés pendant la session.
      void queryClient.invalidateQueries({ queryKey: QUOTES_ROOT_KEY });
    };
  }, [queryClient]);

  // ─── Statut, conversion, versions ─────────────────────────────────────────

  const markQuoteStatus = useCallback(
    async (status: 'ENVOYE' | 'ACCEPTE' | 'BROUILLON') => {
      const id = stateRef.current.quoteId;
      if (!id) {
        toast.error('Enregistrez le devis avant de changer son statut.');
        return;
      }
      patch({ busy: true });
      await inflightPromise.current?.catch(() => false);
      const snapshotAtStart = snapshotKeyRef.current;
      const previous = stateRef.current.quoteStatus;
      try {
        const totals = await updateQuote(id, { ...getCurrentPayload(), status });
        patch({ persistedTotals: totals, quoteStatus: status, savedAt: new Date(), dirty: false });
        persistedSnapshotRef.current = snapshotAtStart;
        invalidateLists();
        toast.success(
          status === 'ENVOYE'
            ? previous === 'ACCEPTE'
              ? 'Devis repassé en « Envoyé ».'
              : 'Devis marqué comme envoyé.'
            : status === 'ACCEPTE'
              ? 'Devis marqué comme accepté.'
              : 'Devis repassé en brouillon.',
        );
      } catch (e) {
        toast.error(errorMessage(e, 'Changement de statut impossible'));
      } finally {
        patch({ busy: false });
      }
    },
    [getCurrentPayload, invalidateLists, patch],
  );

  const convertToOrder = useCallback(
    async (fulfillment: QuoteFulfillment, warehouse?: QuoteFulfillmentWarehouse) => {
      const id = stateRef.current.quoteId;
      if (!id) return false;
      patch({ busy: true });
      try {
        // Persiste d'abord l'état affiché : le back relit les lignes en base.
        await saveQuoteRef.current({ silent: true });
        const result = await createPrestashopOrderFromQuote(id, fulfillment, warehouse);
        if (!result.success) {
          toast.error(result.message || 'Échec de la conversion.');
          return false;
        }
        patch({ quoteStatus: 'CONVERTED' });
        toast.success(
          `Commande PrestaShop créée${result.reference ? ` — ${result.reference}` : ''}.`,
        );
        invalidateLists();
        await loadQuote(id);
        return true;
      } catch (e) {
        toast.error(errorMessage(e, 'Conversion impossible'));
        return false;
      } finally {
        patch({ busy: false });
      }
    },
    [invalidateLists, loadQuote, patch],
  );

  const startRevision = useCallback(
    async (reason?: string) => {
      const id = stateRef.current.quoteId;
      if (!id) return;
      patch({ busy: true });
      try {
        const r = await startQuoteRevision(id, reason);
        await loadQuote(id);
        invalidateLists();
        toast.success(
          `Version ${r.currentRevision + 1} en préparation : le client voit toujours la version ${r.currentRevision}.`,
        );
      } catch (e) {
        toast.error(errorMessage(e, 'Impossible d’ouvrir une nouvelle version'));
      } finally {
        patch({ busy: false });
      }
    },
    [invalidateLists, loadQuote, patch],
  );

  const cancelRevision = useCallback(async () => {
    const id = stateRef.current.quoteId;
    if (!id) return;
    patch({ busy: true });
    try {
      const r = await cancelQuoteRevisionDraft(id);
      await loadQuote(id);
      invalidateLists();
      toast.success(`Version en préparation abandonnée : retour à la version ${r.currentRevision}.`);
    } catch (e) {
      toast.error(errorMessage(e, 'Impossible d’abandonner la version'));
    } finally {
      patch({ busy: false });
    }
  }, [invalidateLists, loadQuote, patch]);

  // ─── Lignes ────────────────────────────────────────────────────────────────

  const addProductFromHit = useCallback(
    async (hit: PrestaProductSearchHit) => {
      const tr = normalizeTaxRate(hit.taxRate ?? 0.2);
      const priceTTC = hit.unitPriceHT != null && hit.unitPriceHT > 0 ? hit.unitPriceHT * (1 + tr) : 0;
      const baseTTC = hit.basePriceHT != null && hit.basePriceHT > 0 ? hit.basePriceHT * (1 + tr) : undefined;
      const lineKey = newLineKey();
      setLines((prev) => [
        ...prev,
        {
          key: lineKey,
          reference: hit.reference,
          quantity: 1,
          unitPriceHT: priceTTC > 0 ? priceTTC / (1 + tr) : 0,
          catalogPriceTTC: priceTTC,
          baseCatalogPriceTTC: baseTTC && baseTTC > priceTTC ? baseTTC : undefined,
          discountPct: 0,
          productLabel: hit.label || hit.reference,
          taxRate: tr,
          prestashopProductId: hit.prestashopProductId,
          imageUrl: hit.imageUrl ?? undefined,
          weightInGrams: null,
          nbColisLine: 1,
          costHT: null,
          ecotaxHT: null,
          active: hit.active,
          priceMode: 'catalog' as const,
          loading: true,
        },
      ]);
      try {
        const batch = await getApproRowsBatchByReferences([hit.reference]);
        const row = batch.data[hit.reference];
        const npc = row?.nbPieceByColis ?? null;
        setLines((prev) =>
          prev.map((L) =>
            L.key !== lineKey
              ? L
              : {
                  ...L,
                  weightInGrams: row?.weightInGrams ?? null,
                  packageLengthCm: row?.packageLengthCm ?? null,
                  packageWidthCm: row?.packageWidthCm ?? null,
                  packageHeightCm: row?.packageHeightCm ?? null,
                  nbPieceByColis: npc,
                  nbColisLine: L.nbColisLineManual
                    ? L.nbColisLine
                    : Math.max(1, Math.ceil(L.quantity / (npc || 1))),
                  codeFlevy: row?.codeFlevy || null,
                  codeDombasle: row?.codeDombasle || null,
                  costHT: row?.fixPriceHT ?? null,
                  ecotaxHT: bestWarehouseEcotaxHT(row),
                  loading: false,
                },
          ),
        );
      } catch {
        setLines((prev) => prev.map((L) => (L.key !== lineKey ? L : { ...L, loading: false })));
      }
    },
    [setLines],
  );

  const addProductByReference = useCallback(
    async (rawReference: string, quantity: number) => {
      const reference = rawReference.trim();
      const qty = Math.max(1, Math.floor(quantity) || 1);
      if (!reference) {
        toast.error('Indiquez une référence produit.');
        return;
      }
      const lineKey = newLineKey();
      setLines((prev) => [
        ...prev,
        {
          key: lineKey,
          reference,
          quantity: qty,
          unitPriceHT: 0,
          catalogPriceTTC: 0,
          discountPct: 0,
          taxRate: 0.2,
          nbColisLine: qty,
          priceMode: 'catalog' as const,
          loading: true,
        },
      ]);

      let label: string | undefined;
      let taxRate = 0.2;
      let productId: string | number | undefined;
      let imageUrl: string | undefined;
      let active: boolean | undefined;
      let priceTTC = 0;
      let baseTTC: number | undefined;
      try {
        const res = await resolveProductByReference(reference);
        label = res.label;
        taxRate = normalizeTaxRate(res.taxRate);
        productId = res.prestashopProductId;
        imageUrl = res.imageUrl ?? undefined;
        active = res.active;
        priceTTC = res.unitPriceHT > 0 ? res.unitPriceHT * (1 + taxRate) : 0;
        baseTTC = res.basePriceHT != null && res.basePriceHT > 0 ? res.basePriceHT * (1 + taxRate) : undefined;
      } catch {
        // Référence inconnue : la ligne reste avec des valeurs par défaut (prix à saisir).
      }
      let row: Awaited<ReturnType<typeof getApproRowsBatchByReferences>>['data'][string] = null;
      try {
        row = (await getApproRowsBatchByReferences([reference])).data[reference] ?? null;
      } catch {
        // Pas bloquant.
      }
      const npc = row?.nbPieceByColis ?? null;
      setLines((prev) =>
        prev.map((L) =>
          L.key !== lineKey
            ? L
            : {
                ...L,
                productLabel: label ?? L.productLabel,
                taxRate,
                unitPriceHT: priceTTC > 0 ? priceTTC / (1 + taxRate) : 0,
                catalogPriceTTC: priceTTC,
                baseCatalogPriceTTC: baseTTC && baseTTC > priceTTC ? baseTTC : undefined,
                prestashopProductId: productId,
                imageUrl: imageUrl ?? row?.thumbnailBase64 ?? L.imageUrl,
                weightInGrams: row?.weightInGrams ?? null,
                packageLengthCm: row?.packageLengthCm ?? null,
                packageWidthCm: row?.packageWidthCm ?? null,
                packageHeightCm: row?.packageHeightCm ?? null,
                nbPieceByColis: npc,
                nbColisLine: Math.max(1, Math.ceil(L.quantity / (npc || 1))),
                codeFlevy: row?.codeFlevy || null,
                codeDombasle: row?.codeDombasle || null,
                costHT: row?.fixPriceHT ?? null,
                ecotaxHT: bestWarehouseEcotaxHT(row),
                active,
                loading: false,
              },
        ),
      );
      if (!productId) toast.error(`Référence « ${reference} » introuvable sur PrestaShop : saisissez le prix.`);
    },
    [setLines],
  );

  const addTextLine = useCallback(
    (type: 'title' | 'text', content: string) => setLines((prev) => [...prev, { ...blankTextLine(type, content) }]),
    [setLines],
  );

  const removeLine = useCallback(
    (key: string) => setLines((prev) => prev.filter((L) => L.key !== key)),
    [setLines],
  );

  const updateLine = useCallback(
    (key: string, changes: Partial<LineRow>) =>
      setLines((prev) => prev.map((L) => (L.key === key ? { ...L, ...changes } : L))),
    [setLines],
  );

  const setLineQuantity = useCallback(
    (key: string, quantity: number) =>
      setLines((prev) =>
        prev.map((L) => {
          if (L.key !== key) return L;
          const q = Math.max(1, Math.floor(quantity) || 1);
          // Un nombre de colis forcé à la main n'est pas écrasé par la quantité.
          const colis = L.nbColisLineManual ? L.nbColisLine : Math.max(1, Math.ceil(q / (L.nbPieceByColis || 1)));
          return { ...L, quantity: q, nbColisLine: colis };
        }),
      ),
    [setLines],
  );

  const moveLine = useCallback(
    (key: string, direction: -1 | 1) =>
      setLines((prev) => {
        const index = prev.findIndex((L) => L.key === key);
        const target = index + direction;
        const moved = prev[index];
        const swapped = prev[target];
        if (index < 0 || target < 0 || target >= prev.length || !moved || !swapped) return prev;
        const next = [...prev];
        next[index] = swapped;
        next[target] = moved;
        return next;
      }),
    [setLines],
  );

  // ─── Transport ─────────────────────────────────────────────────────────────

  const { nbColisOverride, lines, nbColis } = state;
  const { transportSignature, currentRecoSignature, weightSummary } = derived;

  // Nombre de colis global : somme des colis par ligne, sauf forçage manuel.
  useEffect(() => {
    if (nbColisOverride != null) {
      if (nbColis !== nbColisOverride) patch({ nbColis: nbColisOverride });
      return;
    }
    if (lines.length === 0) return;
    const computed = lines.reduce((sum, L) => sum + Math.max(1, L.nbColisLine ?? 1), 0);
    if (computed !== nbColis) patch({ nbColis: computed });
  }, [lines, nbColisOverride, nbColis, patch]);

  // Signature de la reco GLS enregistrée, reposée dès que les poids sont connus.
  const { recommendedShippingHT, recoSignature } = state;
  useEffect(() => {
    if (
      recoRestorePending.current &&
      recommendedShippingHT != null &&
      recoSignature == null &&
      weightSummary.totalWeightGrams > 0
    ) {
      patch({ recoSignature: currentRecoSignature });
      recoRestorePending.current = false;
      lastTransportSignatureRef.current = null;
      transportRestorePending.current = false;
    }
  }, [recommendedShippingHT, recoSignature, weightSummary.totalWeightGrams, currentRecoSignature, patch]);

  // Toute modification des entrées transport invalide la validation manuelle du transport.
  const { transportChecked } = state;
  useEffect(() => {
    if (transportRestorePending.current) {
      lastTransportSignatureRef.current = transportSignature;
      return;
    }
    const previous = lastTransportSignatureRef.current;
    lastTransportSignatureRef.current = transportSignature;
    if (previous === null) return;
    if (previous !== transportSignature && transportChecked) patch({ transportChecked: false });
  }, [transportSignature, transportChecked, patch]);

  const runGlsRecommendation = useCallback(async () => {
    const total = derivedRef.current.weightSummary.totalWeightGrams;
    const n = Math.max(1, Math.floor(stateRef.current.nbColis) || 1);
    const perParcel = total > 0 ? Math.ceil(total / n) : 0;
    if (total <= 0 || perParcel <= 0) {
      patch({
        recommendedShippingHT: null,
        recommendedShippingError: 'Poids inconnu : recommandation indisponible.',
        recoSignature: null,
      });
      return;
    }
    setRecommendedShippingLoading(true);
    try {
      const perParcelHT = await getGlsShippingCostHT(perParcel);
      if (perParcelHT > 0) {
        patch({
          recommendedShippingHT: Number((perParcelHT * n).toFixed(2)),
          recoSignature: derivedRef.current.currentRecoSignature,
          recommendedShippingError: null,
        });
      } else {
        patch({ recommendedShippingHT: null, recommendedShippingError: 'Aucune tranche GLS pour ce poids.', recoSignature: null });
      }
    } catch {
      patch({ recommendedShippingHT: null, recommendedShippingError: 'Recommandation indisponible.', recoSignature: null });
    } finally {
      setRecommendedShippingLoading(false);
    }
  }, [patch]);

  const applyRecommendedToFee = useCallback(async () => {
    const fee = stateRef.current.recommendedShippingHT;
    if (fee == null) return;
    patch({ shippingFeeHT: fee, shippingFeeOffered: false });
  }, [patch]);

  // ─── Proposition IA ────────────────────────────────────────────────────────

  const proposePricing = useCallback(async (): Promise<boolean> => {
    const s = stateRef.current;
    // Exclut titres / textes et lignes invalides : le back impose quantité ≥ 1 et référence non vide.
    const productLines = s.lines.filter(
      (L) => (L.lineType ?? 'product') === 'product' && L.reference.trim() !== '' && L.quantity >= 1,
    );
    if (productLines.length === 0) {
      setPricing({ busy: false, error: 'Ajoutez au moins une ligne produit avant de demander une proposition.' });
      return false;
    }
    setPricing({ busy: true, error: null });
    try {
      const items: QuotePricingProposalItem[] = productLines.map((L) => {
        const tr = normalizeTaxRate(L.taxRate || 0.2);
        return {
          reference: L.reference,
          quantity: L.quantity,
          // Prix catalogue HT : plafond absolu côté back.
          catalogPriceHT: L.catalogPriceTTC > 0 ? L.catalogPriceTTC / (1 + tr) : undefined,
        };
      });
      const proposal = await proposeQuotePricing(items, { shippingOffered: s.shippingFeeOffered });
      patch({ pricingProposal: proposal, showPricingPanel: true, pricingGeneratedAt: new Date() });

      // Une ligne de proposition par item, dans le même ordre : association par index, avec repli
      // prudent par référence unique si l'alignement est incertain.
      const byKey = new Map<string, QuotePricingProposalLine>();
      const aligned =
        proposal.lines.length === productLines.length &&
        proposal.lines.every((pl, i) => pl.reference.trim() === productLines[i]?.reference.trim());
      if (aligned) {
        productLines.forEach((L, i) => {
          const pl = proposal.lines[i];
          if (pl) byKey.set(L.key, pl);
        });
      } else {
        const refCount = new Map<string, number>();
        for (const L of productLines) refCount.set(L.reference.trim(), (refCount.get(L.reference.trim()) ?? 0) + 1);
        for (const L of productLines) {
          if (refCount.get(L.reference.trim()) !== 1) continue;
          const pl = proposal.lines.find((p) => p.reference.trim() === L.reference.trim());
          if (pl) byKey.set(L.key, pl);
        }
      }

      setLines((prev) =>
        prev.map((L) => {
          // Un prix saisi à la main n'est jamais écrasé par l'IA.
          if (L.priceMode === 'custom') return L;
          const pl = byKey.get(L.key);
          if (!pl || pl.proposedUnitHT == null || !pl.found) return L;
          const catalogHT = L.catalogPriceTTC > 0 ? L.catalogPriceTTC / (1 + L.taxRate) : 0;
          let next = pl.proposedUnitHT;
          // Plafonné au prix catalogue HT : jamais plus cher que le prix public.
          if (catalogHT > 0 && next > catalogHT) next = catalogHT;
          return { ...L, unitPriceHT: round2(next), priceMode: 'proposed' as const };
        }),
      );

      const id = stateRef.current.quoteId;
      if (id) {
        try {
          await saveAiProposalSnapshot(id, proposal);
        } catch {
          // Snapshot non persisté : pas bloquant.
        }
      }
      setPricing({ busy: false, error: null });
      return true;
    } catch (e) {
      setPricing({ busy: false, error: errorMessage(e, 'Proposition indisponible') });
      return false;
    }
  }, [patch, setLines]);

  // ─── Client ────────────────────────────────────────────────────────────────

  const pickCustomer = useCallback(
    async (hit: Pick<PrestaCustomerHit, 'id'>) => {
      try {
        const detail = await getPrestaShopCustomer(hit.id);
        patch({ clientMode: 'prestashop', selectedCustomer: detail, customerMissingPs: false, quoteAddressDisplay: null });
      } catch (e) {
        toast.error(errorMessage(e, 'Client introuvable'));
      }
    },
    [patch],
  );

  const pickProspect = useCallback(
    async (hit: QuoteProspectHit) => {
      if (hit.prestashopCustomerId) {
        await pickCustomer({ id: hit.prestashopCustomerId });
        return;
      }
      patch({
        clientMode: 'prospect',
        pickedProspect: hit,
        selectedCustomer: null,
        draft: {
          ...emptyCustomerDraft(),
          email: hit.email,
          firstname: hit.firstname ?? '',
          lastname: hit.lastname ?? '',
          company: hit.company ?? '',
          phone: hit.phone ?? '',
          address1: hit.address1 ?? '',
          postcode: hit.postcode ?? '',
          city: hit.city ?? '',
          country: hit.country || 'FR',
        },
      });
    },
    [patch, pickCustomer],
  );

  const setDraft = useCallback(
    (changes: Partial<QuoteCustomerDraft>) =>
      patch({ draft: { ...stateRef.current.draft, ...changes } }),
    [patch],
  );

  const setClientMode = useCallback(
    (mode: 'prestashop' | 'prospect') => patch({ clientMode: mode }),
    [patch],
  );

  const createPsCustomer = useCallback(async () => {
    const id = stateRef.current.quoteId;
    if (!id) {
      toast.error('Enregistrez le devis avant de créer le client PrestaShop.');
      return;
    }
    patch({ busy: true });
    try {
      await saveQuoteRef.current({ silent: true });
      const res = await createPsCustomerFromQuote(id, { useDevisEmailSuffix: true });
      await loadQuote(id);
      invalidateLists();
      toast.success(`Client PrestaShop #${res.prestashopId} créé (${res.email}).`);
    } catch (e) {
      toast.error(errorMessage(e, 'Création du client impossible'));
    } finally {
      patch({ busy: false });
    }
  }, [invalidateLists, loadQuote, patch]);

  const value: QuoteEditorContextValue = {
    state,
    derived,
    patch,
    setLines,
    saveQuote,
    reload,
    getCurrentPayload,
    markQuoteStatus,
    convertToOrder,
    startRevision,
    cancelRevision,
    addProductFromHit,
    addProductByReference,
    addTextLine,
    removeLine,
    updateLine,
    setLineQuantity,
    moveLine,
    recommendedShippingLoading,
    runGlsRecommendation,
    applyRecommendedToFee,
    pricing,
    proposePricing,
    pickCustomer,
    pickProspect,
    setDraft,
    setClientMode,
    createPsCustomer,
  };

  return <QuoteEditorContext.Provider value={value}>{children}</QuoteEditorContext.Provider>;
}

export function useQuoteEditor(): QuoteEditorContextValue {
  const ctx = useContext(QuoteEditorContext);
  if (!ctx) throw new Error('useQuoteEditor doit être utilisé dans un QuoteEditorProvider');
  return ctx;
}
