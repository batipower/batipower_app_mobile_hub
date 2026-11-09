import { router } from 'expo-router';

import type { DeployedPrices } from './channels';

/**
 * Page « Déploiement » d'un produit (marges par canal), ouverte depuis le push « Produit
 * déployé ». Les prix de mise en ligne du push, quand ils sont connus, évitent à la page de les
 * estimer.
 */
export function openDeployment(reference: string, prices: DeployedPrices = {}) {
  router.push({
    pathname: '/hub/deploiement/[reference]',
    params: {
      reference,
      ...(prices.amazon != null ? { amazon: String(prices.amazon) } : {}),
      ...(prices.manoMano != null ? { manoMano: String(prices.manoMano) } : {}),
      ...(prices.leroyMerlin != null ? { leroyMerlin: String(prices.leroyMerlin) } : {}),
    },
  });
}

/** Prix de mise en ligne portés par `data.deploy` du push (`amazon`, `manomano`, `leroymerlin`). */
export function deployedPricesFromPush(deploy: unknown): DeployedPrices {
  if (!deploy || typeof deploy !== 'object') return {};
  const source = deploy as Record<string, { status?: unknown; priceTTC?: unknown } | undefined>;
  const read = (key: string): number | undefined => {
    const entry = source[key];
    return entry?.status === 'success' && typeof entry.priceTTC === 'number' && entry.priceTTC > 0
      ? entry.priceTTC
      : undefined;
  };
  const prices: DeployedPrices = {};
  const amazon = read('amazon');
  const manoMano = read('manomano');
  const leroyMerlin = read('leroymerlin');
  if (amazon != null) prices.amazon = amazon;
  if (manoMano != null) prices.manoMano = manoMano;
  if (leroyMerlin != null) prices.leroyMerlin = leroyMerlin;
  return prices;
}
