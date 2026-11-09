import { buyboxMargin, websiteMargin, type Margin } from '@/features/pricing/rowMetrics';
import type { HubPricingRow, PricingMarketplaceKey } from '@/types/hubPricing';

export type DeploymentChannelKey = 'amazon' | 'manoMano' | 'leroyMerlin' | 'site';

export const DEPLOYMENT_CHANNELS: readonly DeploymentChannelKey[] = [
  'amazon',
  'manoMano',
  'leroyMerlin',
  'site',
];

export const DEPLOYMENT_CHANNEL_LABELS: Record<DeploymentChannelKey, string> = {
  amazon: 'Amazon',
  manoMano: 'ManoMano',
  leroyMerlin: 'Leroy Merlin',
  site: 'Site Batipower',
};

/** Prix de mise en ligne par marketplace tels que renvoyés par le déploiement (TTC). */
export type DeployedPrices = Partial<Record<Exclude<DeploymentChannelKey, 'site'>, number>>;

/**
 * Prix TTC envoyé à la marketplace au déploiement : même règle que le back
 * (`computeDeployPrice` : prix d'équilibre HT × 1,2 × 1,5). Sert de repli quand le prix réel du
 * push n'est pas connu (ouverture depuis un autre point d'entrée).
 */
export function estimatedDeployPriceTTC(equilibriumHT: number | null | undefined): number | null {
  if (equilibriumHT == null || !Number.isFinite(equilibriumHT) || equilibriumHT <= 0) return null;
  return Math.round(equilibriumHT * 1.2 * 1.5 * 100) / 100;
}

export interface ChannelMargin {
  /** Prix de vente TTC de la marge affichée. */
  priceTTC: number | null;
  /** `true` si le prix vient du push, `false` s'il est estimé depuis le prix d'équilibre. */
  priceIsActual: boolean;
  margin: Margin | null;
}

/** Marge d'un canal au prix déployé (marketplaces : PV × (1 − commission) − PA − transport ; site : PV − PA). */
export function channelMargin(
  row: HubPricingRow,
  channel: DeploymentChannelKey,
  deployedPrices: DeployedPrices,
): ChannelMargin {
  if (channel === 'site') {
    return {
      priceTTC: row.website.priceTTC,
      priceIsActual: row.website.priceTTC != null,
      margin: websiteMargin(row, 'FR'),
    };
  }
  const key: PricingMarketplaceKey = channel;
  const fromPush = deployedPrices[channel];
  const priceTTC = fromPush ?? estimatedDeployPriceTTC(row.marketplaces[key].equilibriumPrice);
  return {
    priceTTC,
    priceIsActual: fromPush != null,
    margin: priceTTC != null ? buyboxMargin(row, key, priceTTC, 'FR') : null,
  };
}
