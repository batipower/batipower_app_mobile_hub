import type { CategoryTypeEnum } from '@/types/discussions';

/**
 * Dashboard flux, vue simplifiée (`logistics-app/orders/flow-dashboard/simple`), repris de
 * `FlowDashboardSimpleResponse` de `front_externe_batipower/lib/types.ts`. Jamais de prix de vente.
 */

export type FlowDashboardCountryCode = 'FR' | 'IT' | 'ES' | 'DE' | 'BE' | 'OTHER';

/** Entrepôts opérationnels couverts par le dashboard flux. */
export type FlowDashboardWarehouse = 'DOMBASLE' | 'FLEVY' | 'QG_BATIPOWER';

export interface FlowSimpleCountryEntry {
  country: FlowDashboardCountryCode;
  ordersIn: number;
  unitsIn: number;
}

export interface FlowSimpleServiceEntry {
  categoryType: CategoryTypeEnum | null;
  ordersIn: number;
  unitsIn: number;
  /** Colis : max(1, forceNbColis || nbColis eBat || 1) par commande. */
  colisIn: number;
}

/** Un mois sélectionné : achats HT fournisseurs, BL reçus, colis et ruptures au dernier relevé. */
export interface FlowSimpleMonthlyEntry {
  month: string;
  purchasesHT: number;
  deliveryNotes: number;
  colisIn: number;
  ruptureRefs: number | null;
}

export interface FlowDashboardSimpleWarehouse {
  warehouse: FlowDashboardWarehouse;
  byCountry: FlowSimpleCountryEntry[];
  byService: FlowSimpleServiceEntry[];
  /** Une entrée par mois de `months`, dans le même ordre. */
  byMonth: FlowSimpleMonthlyEntry[];
}

export interface FlowDashboardSimpleResponse {
  generatedAt: string;
  /** Mois appliqués (`YYYY-MM`). */
  months: string[];
  warehouses: FlowDashboardSimpleWarehouse[];
}
