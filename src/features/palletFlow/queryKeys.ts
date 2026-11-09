/** Préfixe de clés de cache du flux palette (invalidation groupée après une action ou un push). */
export const PALLET_FLOW_ROOT_KEY = ['hub-pallet-flow'] as const;

export const palletCandidatesKey = () => [...PALLET_FLOW_ROOT_KEY, 'candidates'] as const;

export const palletMarginKey = (reference: string | undefined) =>
  [...PALLET_FLOW_ROOT_KEY, 'margin', reference] as const;

export const palletQuotesKey = (reference: string | undefined) =>
  [...PALLET_FLOW_ROOT_KEY, 'quotes', reference] as const;
