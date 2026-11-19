import type { UpdateHubProductPayload } from '@/types/hubPricing';
import type { HubMarketplaceKey } from '@/types/hubProductMarketplaces';

const RENTABILITY_FIELD = {
  amazon: 'tauxAmazonRentability',
  manoMano: 'tauxManoManoRentability',
  leroyMerlin: 'tauxLeroyMerlinRentability',
  castorama: 'tauxCastoramaRentability',
  bricoman: 'tauxBricomanRentability',
  cdiscount: 'tauxCdiscountRentability',
} as const satisfies Record<HubMarketplaceKey, keyof UpdateHubProductPayload>;

/**
 * Charge utile de `PATCH hub-app/products/:ref` pour la commission (en %). ManoMano hors France
 * s'écrit par pays : le back remplace tout l'objet, on renvoie donc les autres pays inchangés.
 */
export function buildCommissionPayload(
  key: HubMarketplaceKey,
  country: string,
  value: number | null,
  manoManoByCountry: Record<string, number> | null | undefined,
): UpdateHubProductPayload {
  if (key === 'manoMano' && country !== 'FR') {
    const next = { ...(manoManoByCountry ?? {}) };
    if (value == null) delete next[country];
    else next[country] = value;
    return { tauxManoManoRentabilityByCountry: next };
  }
  return { [RENTABILITY_FIELD[key]]: value };
}
