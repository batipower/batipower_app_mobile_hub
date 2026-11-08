import type {
  PrestaCustomerDetail,
  QuoteCustomerDraft,
  QuoteFulfillmentMode,
  QuoteGlobalDiscountType,
  QuotePersistedTotals,
  QuotePricingProposalResponse,
  QuoteProspectHit,
  QuoteWarehouse,
} from '@/types/hubCustomerQuotes';

import type { LineRow } from '../lib/line-types';
import { emptyCustomerDraft } from '../lib/quote-payload';

export type QuoteFulfillmentState = {
  mode: QuoteFulfillmentMode | null;
  warehouse: QuoteWarehouse | null;
  ebatOrderNumber: string | null;
  ebatOrderError: string | null;
};

/**
 * État unique du devis en édition, porté depuis `quote-editor-reducer.ts` du web (sans les
 * champs eBAT, qui restent sur le web). Un seul état géré par `useReducer` plutôt que des
 * dizaines de `useState`.
 */
export interface QuoteEditorState {
  /* Identité / statut */
  quoteId: string | null;
  quoteReference: string | null;
  quoteStatus: string;
  prestashopOrderRef: string | null;
  prestashopOrderId: number | null;
  currentRevision: number;
  revisionDraftOpen: boolean;
  revisionsEnforced: boolean;
  quoteFulfillment: QuoteFulfillmentState;

  /* Client */
  clientMode: 'prestashop' | 'prospect';
  selectedCustomer: PrestaCustomerDetail | null;
  draft: QuoteCustomerDraft;
  pickedProspect: QuoteProspectHit | null;
  customerMissingPs: boolean;
  quoteAddressDisplay: string | null;
  quoteDeliveryAddressId: number | undefined;
  quoteInvoiceAddressId: number | undefined;

  /* Lignes */
  lines: LineRow[];

  /* Transport */
  shippingFeeHT: number;
  shippingFeeOffered: boolean;
  supplierShippingOffered: boolean;
  nbColis: number;
  nbColisOverride: number | null;
  recommendedShippingHT: number | null;
  recommendedShippingError: string | null;
  recoSignature: string | null;
  transportChecked: boolean;

  /* Remise globale */
  globalDiscountLabel: string;
  globalDiscountType: QuoteGlobalDiscountType;
  globalDiscountValue: number;

  /* Notes */
  internalNotes: string;
  customerNotes: string;
  weeeTaxHT: number;

  /* Proposition IA */
  pricingProposal: QuotePricingProposalResponse | null;
  pricingGeneratedAt: Date | null;
  showPricingPanel: boolean;

  /* Totaux persistés côté back (source de vérité de la marge) */
  persistedTotals: QuotePersistedTotals | null;

  /* UI */
  isInitialLoading: boolean;
  loadError: string | null;
  busy: boolean;
  savedAt: Date | null;
  dirty: boolean;
}

export function createInitialQuoteEditorState(isNew: boolean): QuoteEditorState {
  return {
    quoteId: null,
    quoteReference: null,
    quoteStatus: 'BROUILLON',
    prestashopOrderRef: null,
    prestashopOrderId: null,
    currentRevision: 0,
    revisionDraftOpen: false,
    revisionsEnforced: false,
    quoteFulfillment: { mode: null, warehouse: null, ebatOrderNumber: null, ebatOrderError: null },

    clientMode: 'prestashop',
    selectedCustomer: null,
    draft: emptyCustomerDraft(),
    pickedProspect: null,
    customerMissingPs: false,
    quoteAddressDisplay: null,
    quoteDeliveryAddressId: undefined,
    quoteInvoiceAddressId: undefined,

    lines: [],

    shippingFeeHT: 0,
    shippingFeeOffered: false,
    supplierShippingOffered: false,
    nbColis: 1,
    nbColisOverride: null,
    recommendedShippingHT: null,
    recommendedShippingError: null,
    recoSignature: null,
    transportChecked: false,

    globalDiscountLabel: '',
    globalDiscountType: 'PERCENT',
    globalDiscountValue: 0,

    internalNotes: '',
    customerNotes: '',
    weeeTaxHT: 0,

    pricingProposal: null,
    pricingGeneratedAt: null,
    showPricingPanel: false,

    persistedTotals: null,

    isInitialLoading: !isNew,
    loadError: null,
    busy: false,
    savedAt: null,
    dirty: false,
  };
}

export type QuoteEditorAction =
  | { type: 'PATCH'; payload: Partial<QuoteEditorState> }
  | { type: 'SET_LINES'; payload: LineRow[] | ((prev: LineRow[]) => LineRow[]) };

export function quoteEditorReducer(
  state: QuoteEditorState,
  action: QuoteEditorAction,
): QuoteEditorState {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.payload };
    case 'SET_LINES': {
      const next = typeof action.payload === 'function' ? action.payload(state.lines) : action.payload;
      return next === state.lines ? state : { ...state, lines: next };
    }
    default:
      return state;
  }
}
