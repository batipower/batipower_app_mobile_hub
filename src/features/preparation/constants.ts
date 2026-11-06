import type { StockFilter } from '@/types/preparation';

/** Reprises de `front_externe_batipower/lib/hub/preparation/constants.ts`. */
export const STOCK_QG_TAG = 'STOCK_QG';

export const STANDARD_TAGS: ReadonlySet<string> = new Set([
  'COMMANDE URGENTE',
  'PRIORITAIRE',
  'EXPRESS',
  'STANDARD',
  'RETARD',
  'BERTRAND',
]);

/** Rafraîchissement automatique, uniquement quand l'écran est affiché. */
export const TO_PREPARE_REFRESH_MS = 30_000;
export const DRIVERS_TOUR_REFRESH_MS = 60_000;

export const STOCK_FILTER_ORDER: readonly StockFilter[] = ['all', 'stock', 'attente', 'nonaffecte'];

export const STOCK_FILTER_LABEL: Record<StockFilter, string> = {
  all: 'Toutes',
  stock: 'En stock QG',
  attente: 'Attente livreur',
  nonaffecte: 'Non affecté',
};
