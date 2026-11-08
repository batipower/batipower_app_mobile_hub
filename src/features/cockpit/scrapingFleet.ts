import { router } from 'expo-router';

import type { ScrapingFleetTarget } from '@/types/hubSupervision';

/** En dessous de ce nombre de scrapers en route (libres + actifs), l'indicateur passe en alerte. */
export const SCRAPING_AGENTS_LOW_THRESHOLD = 2;

export type ScrapingFleetTone = 'ok' | 'warning' | 'alert';

/**
 * Couleur de l'indicateur : rouge sous 2 bots en route, orange sous l'optimal, vert à l'optimal.
 * Sans optimal connu (route indisponible), règle historique : orange quand aucun bot n'est libre.
 */
export function scrapingFleetTone(
  running: number,
  optimal: number | null,
  idle: number,
): ScrapingFleetTone {
  if (running < SCRAPING_AGENTS_LOW_THRESHOLD) return 'alert';
  if (optimal !== null) return running < optimal ? 'warning' : 'ok';
  return idle === 0 ? 'warning' : 'ok';
}

/** Détail par pays, ex. « FR 5/9 · DE 0/2 · ES 1/2 · IT 1/1 ». */
export function formatScrapingFleetDetail(pools: ScrapingFleetTarget['pools']): string {
  return pools.map((pool) => `${pool.country} ${pool.running}/${pool.optimal}`).join(' · ');
}

/** Ouvre la feuille « Flotte de scrapers » (détail par pays), par-dessus les onglets du HUB. */
export function openScrapingFleet() {
  router.push('/hub/scraping-fleet');
}
