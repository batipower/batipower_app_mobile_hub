import type {
  BuyboxDangerStock,
  MissedOpportunityMarketplace,
  MissedOpportunityStock,
  PricingMarketplaceKey,
  PricingReturnType,
  PricingReturnTypeFilter,
  PricingSortBy,
  SoldChannel,
  SoldDays,
  SupplierOrderFilter,
  WarehouseAffectation,
} from '@/types/hubPricing';

/** Services (type de catégorie) filtrables, repris de `CATEGORY_TYPE_OPTIONS` du web. */
export const CATEGORY_TYPE_OPTIONS = [
  { value: 'ELECTRICITE', label: 'Électricité' },
  { value: 'VENTILATION', label: 'Ventilation' },
  { value: 'PLOMBERIE', label: 'Plomberie' },
  { value: 'CHAUFFAGE', label: 'Chauffage' },
  { value: 'SANITAIRE', label: 'Sanitaire' },
  { value: 'OUTILLAGE', label: 'Outillage' },
  { value: 'CARRELAGE', label: 'Carrelage' },
  { value: 'PHOTO', label: 'Photo' },
] as const;

/** Entrepôts à stock (affectation, stock par entrepôt). */
export const WAREHOUSE_OPTIONS: { value: Exclude<WarehouseAffectation, ''>; label: string }[] = [
  { value: 'FLEVY', label: 'Flevy' },
  { value: 'DOMBASLE', label: 'Dombasle' },
  { value: 'QG_BATIPOWER', label: 'QG Batipower' },
];

export function warehouseLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return WAREHOUSE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** Pays affichables (drapeau + code), repris de `PRICING_COUNTRIES` du web. */
export const PRICING_COUNTRIES = ['FR', 'DE', 'IT', 'ES', 'UK'] as const;
export type PricingCountry = (typeof PRICING_COUNTRIES)[number];

export const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  DE: '🇩🇪',
  IT: '🇮🇹',
  ES: '🇪🇸',
  UK: '🇬🇧',
  NL: '🇳🇱',
  BE: '🇧🇪',
};

export const COUNTRY_NAMES: Record<PricingCountry, string> = {
  FR: 'France',
  DE: 'Allemagne',
  IT: 'Italie',
  ES: 'Espagne',
  UK: 'Royaume-Uni',
};

export const MARKETPLACE_ORDER: PricingMarketplaceKey[] = [
  'amazon',
  'manoMano',
  'leroyMerlin',
  'castorama',
  'bricoman',
  'cdiscount',
];

export const MARKETPLACE_LABELS: Record<PricingMarketplaceKey, { label: string; short: string }> = {
  amazon: { label: 'Amazon', short: 'Amazon' },
  manoMano: { label: 'ManoMano', short: 'ManoMano' },
  leroyMerlin: { label: 'Leroy Merlin', short: 'LM' },
  castorama: { label: 'Castorama', short: 'Casto' },
  bricoman: { label: 'Bricoman', short: 'Bricoman' },
  cdiscount: { label: 'Cdiscount', short: 'Cdiscount' },
};

/**
 * Marketplaces affichées pour le pays choisi (règle de `visibleMarketplaces` du web, avec
 * les colonnes par défaut : Amazon, ManoMano et Leroy Merlin ; les autres sur FR).
 * Amazon est toujours visible, ManoMano en FR/ES/IT, le reste en FR seulement.
 */
export function visibleMarketplaces(country: string): PricingMarketplaceKey[] {
  return MARKETPLACE_ORDER.filter((key) => {
    if (key === 'amazon') return true;
    if (key === 'manoMano') return country === 'FR' || country === 'ES' || country === 'IT';
    return country === 'FR';
  });
}

/** Marketplaces dont le filtre BuyBox existe. */
export const BUYBOX_FILTERABLE: PricingMarketplaceKey[] = [
  'amazon',
  'manoMano',
  'leroyMerlin',
  'castorama',
];

export const SOLD_CHANNEL_VALUES: SoldChannel[] = [
  'ALL',
  'WEBSITE',
  'AMAZON',
  'MANOMANO',
  'LEROY_MERLIN',
  'CASTORAMA',
  'CDISCOUNT',
  'BRICOMAN',
];
export const SOLD_DAYS_VALUES: SoldDays[] = [7, 30, 60, 90, 180, 365];

const CHANNEL_LABELS: Record<string, string> = {
  ALL: 'Tous les canaux',
  WEBSITE: 'Site Batipower',
  AMAZON: 'Amazon',
  MANOMANO: 'ManoMano',
  LEROY_MERLIN: 'Leroy Merlin',
  CASTORAMA: 'Castorama',
  CDISCOUNT: 'Cdiscount',
  BRICOMAN: 'Bricoman',
};

export function soldChannelLabel(channel: SoldChannel): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

export const SOLD_CHANNEL_OPTIONS = SOLD_CHANNEL_VALUES.map((value) => ({
  value,
  label: soldChannelLabel(value),
}));

export const RETURN_TYPE_LABELS: Record<PricingReturnType, string> = {
  TECHNICAL_FAILURE: 'Panne technique',
  BAD_TRANSPORT: 'Casse transport',
  BROKEN_OTHER: 'Cassé (autre)',
  NOT_RESELLABLE: 'Non revendable',
  READY_TO_SELL: 'Prêt à vendre',
  UNVERIFIED: 'Non vérifié',
};

export const RETURN_TYPE_FILTER_OPTIONS: { value: PricingReturnTypeFilter; label: string }[] = [
  { value: 'ANY', label: 'Avec retour (tous types)' },
  { value: 'BROKEN', label: 'Retours cassés (tous)' },
  ...(Object.keys(RETURN_TYPE_LABELS) as PricingReturnType[]).map((value) => ({
    value,
    label: RETURN_TYPE_LABELS[value],
  })),
];

const RETURN_FILTER_VALUES = new Set<string>(RETURN_TYPE_FILTER_OPTIONS.map((o) => o.value));

export function isReturnTypeFilter(
  value: string | null | undefined,
): value is PricingReturnTypeFilter {
  return !!value && RETURN_FILTER_VALUES.has(value);
}

export function returnTypeFilterLabel(value: PricingReturnTypeFilter): string {
  return RETURN_TYPE_FILTER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export const SUPPLIER_ORDER_OPTIONS: { value: SupplierOrderFilter; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'any', label: 'En cours' },
];

export const MISSED_OPPORTUNITY_MARKETPLACES: {
  value: MissedOpportunityMarketplace;
  label: string;
}[] = [
  { value: '', label: 'Aucune' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'manomano', label: 'ManoMano' },
  { value: 'leroymerlin', label: 'Leroy Merlin' },
];

export const MISSED_OPPORTUNITY_STOCKS: { value: MissedOpportunityStock; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'flevy', label: 'Flevy' },
  { value: 'dombasle', label: 'Dombasle' },
  { value: 'qg', label: 'QG' },
];

export const BUYBOX_DANGER_OPTIONS: { value: BuyboxDangerStock; label: string }[] = [
  { value: '', label: 'Aucun' },
  { value: 'all', label: 'Tous' },
  { value: 'both', label: 'Flevy + Dombasle' },
  { value: 'flevy', label: 'Flevy' },
  { value: 'dombasle', label: 'Dombasle' },
  { value: 'qg', label: 'QG' },
];

export const SORT_OPTIONS: { value: PricingSortBy; label: string; group: string }[] = [
  { value: '', label: 'Aucun tri', group: 'Général' },
  {
    value: 'lastMarketplaceDeployment',
    label: 'Dernier déploiement marketplace',
    group: 'Général',
  },
  { value: 'qualityScore', label: 'Note de la fiche site', group: 'Général' },
  { value: 'returnsCount', label: 'Nombre de retours', group: 'Général' },
  { value: 'previSalesByMonth', label: 'Potentiel saisi (par mois)', group: 'Potentiel' },
  { value: 'monthlyPotential', label: 'Potentiel mensuel (tous pays)', group: 'Potentiel' },
  { value: 'monthlyPotentialFR', label: 'Potentiel mensuel FR', group: 'Potentiel' },
  { value: 'monthlyPotentialDE', label: 'Potentiel mensuel DE', group: 'Potentiel' },
  { value: 'monthlyPotentialIT', label: 'Potentiel mensuel IT', group: 'Potentiel' },
  { value: 'monthlyPotentialES', label: 'Potentiel mensuel ES', group: 'Potentiel' },
  { value: 'monthlyPotentialUK', label: 'Potentiel mensuel UK', group: 'Potentiel' },
  { value: 'forecast_FR', label: 'Prévision FR', group: 'Prévisions' },
  { value: 'forecast_DE', label: 'Prévision DE', group: 'Prévisions' },
  { value: 'forecast_IT', label: 'Prévision IT', group: 'Prévisions' },
  { value: 'forecast_ES', label: 'Prévision ES', group: 'Prévisions' },
  { value: 'forecast_UK', label: 'Prévision UK', group: 'Prévisions' },
  { value: 'salesHistory3m', label: 'Ventes sur 3 mois', group: 'Historique des ventes' },
  { value: 'salesHistory6m', label: 'Ventes sur 6 mois', group: 'Historique des ventes' },
  { value: 'salesHistory7m', label: 'Ventes sur 7 mois', group: 'Historique des ventes' },
  { value: 'salesHistory12m', label: 'Ventes sur 12 mois', group: 'Historique des ventes' },
];

export function sortLabel(value: PricingSortBy): string {
  return SORT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
