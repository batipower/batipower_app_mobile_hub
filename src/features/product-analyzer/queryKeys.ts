/**
 * Clés TanStack Query du Product Analyzer. Toutes partent de `PA_ROOT` : une analyse terminée
 * ou une mutation invalide la racine d'un coup (liste, compteurs, fiches).
 */
export const PA_ROOT = ['hub-product-analyzer'] as const;

export const PA_LIST_KEY = [...PA_ROOT, 'list'] as const;
export const PA_COUNTS_KEY = [...PA_ROOT, 'counts'] as const;
export const PA_BRANDS_KEY = [...PA_ROOT, 'brands'] as const;
export const PA_TAGS_KEY = [...PA_ROOT, 'tags'] as const;
export const PA_AFFAIRES_KEY = [...PA_ROOT, 'affaires'] as const;
export const PA_DISTRIBUTORS_KEY = [...PA_ROOT, 'distributors'] as const;
export const PA_RESERVE_KEY = [...PA_ROOT, 'reserve'] as const;

export const paStagingKey = (uuid: string) => [...PA_ROOT, 'staging', uuid] as const;
export const paViabilityKey = (uuid: string) => [...PA_ROOT, 'marketplace-viability', uuid] as const;
export const paRequestsKey = (uuid: string) => [...PA_ROOT, 'nego-requests', uuid] as const;
export const paAffaireStatsKey = (affaireId: string) =>
  [...PA_ROOT, 'affaire-stats', affaireId] as const;
