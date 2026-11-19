import type { HubMarketplaceKey } from '@/types/hubProductMarketplaces';

/** Pays pris en charge, avec la TVA appliquée au prix TTC (repris de `lib/hub/product-sheet/pricing.ts`). */
export type DestinationCountry = 'FR' | 'BE' | 'ES' | 'IT' | 'DE';

const VAT_RATES: Record<DestinationCountry, number> = {
  FR: 1.2,
  BE: 1.21,
  ES: 1.21,
  IT: 1.22,
  DE: 1.19,
};

export const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  BE: '🇧🇪',
  ES: '🇪🇸',
  IT: '🇮🇹',
  DE: '🇩🇪',
};

/** Coefficient TVA du pays (1,2 pour la France) ; la France par défaut pour un pays inconnu. */
export function getVatRate(country: string): number {
  return VAT_RATES[country as DestinationCountry] ?? VAT_RATES.FR;
}

/** Commission par défaut d'une marketplace quand le produit n'a pas de taux propre. */
export const DEFAULT_COMMISSION: Record<HubMarketplaceKey, number> = {
  amazon: 0.15,
  manoMano: 0.13,
  leroyMerlin: 0.12,
  castorama: 0.12,
  bricoman: 0.12,
  cdiscount: 0.15,
};

export interface MarketplaceConfigEntry {
  key: HubMarketplaceKey;
  label: string;
  /** Code d'origine commande, pour le logo. */
  origin: string;
  /** Pays disposant de données propres (la France comprise). */
  countries: string[];
  canCreateOffer: boolean;
  canUpdateOffer: boolean;
  canDeployAsin: boolean;
  /** Synchronisation du SKU depuis PrestaShop. */
  syncSku: boolean;
  /** Liaison de l'offre par EAN. */
  linkEan: boolean;
  /** Retrait forcé de l'offre (force delist). */
  canDelist: boolean;
  /** Le nom du vendeur BuyBox est modifiable. */
  hasSellerName: boolean;
  /** Clé de l'objectif HT modifiable (`PATCH hub-app/products/:ref`) ; `null` si le back n'en a pas. */
  targetField:
    | 'targetPriceAmazon'
    | 'targetPriceManoMano'
    | 'targetPriceLeroyMerlin'
    | 'targetPriceCastorama'
    | 'targetPriceBricoman'
    | null;
}

function entry(
  key: HubMarketplaceKey,
  label: string,
  origin: string,
  countries: string[],
  rest: Omit<MarketplaceConfigEntry, 'key' | 'label' | 'origin' | 'countries'>,
): MarketplaceConfigEntry {
  return { key, label, origin, countries, ...rest };
}

export const MARKETPLACE_CONFIG: readonly MarketplaceConfigEntry[] = [
  entry('amazon', 'Amazon', 'AMAZON', ['FR', 'BE', 'ES', 'IT', 'DE'], {
    canCreateOffer: true,
    canUpdateOffer: true,
    canDeployAsin: true,
    syncSku: true,
    linkEan: false,
    canDelist: true,
    hasSellerName: true,
    targetField: 'targetPriceAmazon',
  }),
  entry('manoMano', 'ManoMano', 'MANOMANO', ['FR', 'ES', 'IT'], {
    canCreateOffer: true,
    canUpdateOffer: true,
    canDeployAsin: false,
    syncSku: true,
    linkEan: true,
    canDelist: true,
    hasSellerName: true,
    targetField: 'targetPriceManoMano',
  }),
  entry('leroyMerlin', 'Leroy Merlin', 'LEROY_MERLIN', ['FR'], {
    canCreateOffer: true,
    canUpdateOffer: true,
    canDeployAsin: false,
    syncSku: true,
    linkEan: true,
    canDelist: true,
    hasSellerName: true,
    targetField: 'targetPriceLeroyMerlin',
  }),
  entry('castorama', 'Castorama', 'CASTORAMA', ['FR'], {
    canCreateOffer: false,
    canUpdateOffer: false,
    canDeployAsin: false,
    syncSku: false,
    linkEan: false,
    canDelist: true,
    hasSellerName: false,
    targetField: 'targetPriceCastorama',
  }),
  // Offre créée à partir de l'offre Leroy Merlin existante (canal Mirakl BMFR).
  entry('bricoman', 'Bricoman', 'BRICOMAN', ['FR'], {
    canCreateOffer: true,
    canUpdateOffer: false,
    canDeployAsin: false,
    syncSku: false,
    linkEan: false,
    canDelist: true,
    hasSellerName: false,
    targetField: 'targetPriceBricoman',
  }),
  entry('cdiscount', 'Cdiscount', 'CDISCOUNT', ['FR'], {
    canCreateOffer: false,
    canUpdateOffer: false,
    canDeployAsin: false,
    syncSku: false,
    linkEan: false,
    canDelist: true,
    hasSellerName: false,
    targetField: null,
  }),
];

export function marketplaceConfig(key: HubMarketplaceKey): MarketplaceConfigEntry {
  return MARKETPLACE_CONFIG.find((entry) => entry.key === key) ?? MARKETPLACE_CONFIG[0]!;
}

export function isHubMarketplaceKey(value: string | undefined): value is HubMarketplaceKey {
  return MARKETPLACE_CONFIG.some((entry) => entry.key === value);
}
