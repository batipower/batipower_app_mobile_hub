import type {
  FlowDashboardCountryCode,
  FlowDashboardSimpleWarehouse,
  FlowDashboardWarehouse,
  FlowSimpleCountryEntry,
  FlowSimpleMonthlyEntry,
  FlowSimpleServiceEntry,
} from '@/types/flowDashboard';

export type WarehouseFilter = 'ALL' | FlowDashboardWarehouse;

export const WAREHOUSE_ORDER: readonly FlowDashboardWarehouse[] = ['DOMBASLE', 'FLEVY', 'QG_BATIPOWER'];

export const WAREHOUSE_LABELS: Record<FlowDashboardWarehouse, string> = {
  DOMBASLE: 'Dombasle',
  FLEVY: 'Flévy',
  QG_BATIPOWER: 'QG',
};

export const COUNTRY_ORDER: readonly FlowDashboardCountryCode[] = ['FR', 'IT', 'ES', 'DE', 'BE', 'OTHER'];

export const COUNTRY_LABELS: Record<FlowDashboardCountryCode, string> = {
  FR: 'France',
  IT: 'Italie',
  ES: 'Espagne',
  DE: 'Allemagne',
  BE: 'Belgique',
  OTHER: 'Autres',
};

const MONTH_LONG_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

const MONTH_SHORT_LABELS = [
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.',
] as const;

function monthIndexOf(key: string): number {
  return Number(key.slice(5, 7)) - 1;
}

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

/** Mois de l'année en cours, de janvier au mois courant (seuls mois acceptés par le back). */
export function availableMonthKeys(now: Date = new Date()): string[] {
  const year = now.getFullYear();
  return Array.from({ length: now.getMonth() + 1 }, (_, i) => monthKey(year, i));
}

/** « Mars », « Févr. »… pour une clé `YYYY-MM`. */
export function monthShortLabel(key: string): string {
  return MONTH_SHORT_LABELS[monthIndexOf(key)] ?? key;
}

/** « Octobre 2026 » pour une clé `YYYY-MM`. */
export function monthLongLabel(key: string): string {
  const name = MONTH_LONG_LABELS[monthIndexOf(key)];
  return name ? `${name} ${key.slice(0, 4)}` : key;
}

/** Libellé de la période : un mois, ou « Année 2026 » pour tous les mois disponibles. */
export function periodLabel(months: readonly string[], now: Date = new Date()): string {
  const [single] = months;
  if (months.length === 1 && single) return monthLongLabel(single);
  return `Année ${now.getFullYear()}`;
}

export function selectWarehouses(
  warehouses: readonly FlowDashboardSimpleWarehouse[],
  filter: WarehouseFilter,
): FlowDashboardSimpleWarehouse[] {
  return filter === 'ALL' ? [...warehouses] : warehouses.filter((item) => item.warehouse === filter);
}

export function mergeCountries(
  warehouses: readonly FlowDashboardSimpleWarehouse[],
): FlowSimpleCountryEntry[] {
  const byCode = new Map<FlowDashboardCountryCode, FlowSimpleCountryEntry>();
  for (const { byCountry } of warehouses) {
    for (const entry of byCountry) {
      const current = byCode.get(entry.country);
      if (current) {
        current.ordersIn += entry.ordersIn;
        current.unitsIn += entry.unitsIn;
      } else {
        byCode.set(entry.country, { ...entry });
      }
    }
  }
  return COUNTRY_ORDER.filter((code) => byCode.has(code)).map((code) => byCode.get(code)!);
}

/** Services fusionnés, du plus gros au plus petit en commandes ; « sans service » en dernier. */
export function mergeServices(
  warehouses: readonly FlowDashboardSimpleWarehouse[],
): FlowSimpleServiceEntry[] {
  const byKey = new Map<string, FlowSimpleServiceEntry>();
  for (const { byService } of warehouses) {
    for (const entry of byService) {
      const key = entry.categoryType ?? '__NONE__';
      const current = byKey.get(key);
      if (current) {
        current.ordersIn += entry.ordersIn;
        current.unitsIn += entry.unitsIn;
        current.colisIn += entry.colisIn ?? 0;
      } else {
        byKey.set(key, { ...entry, colisIn: entry.colisIn ?? 0 });
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.ordersIn - a.ordersIn);
}

/** Série mensuelle fusionnée sur les entrepôts retenus, par mois croissant. */
export function mergeMonths(
  warehouses: readonly FlowDashboardSimpleWarehouse[],
): FlowSimpleMonthlyEntry[] {
  const byMonth = new Map<string, FlowSimpleMonthlyEntry>();
  for (const { byMonth: entries } of warehouses) {
    for (const entry of entries ?? []) {
      const current = byMonth.get(entry.month);
      if (current) {
        current.purchasesHT += entry.purchasesHT;
        current.deliveryNotes += entry.deliveryNotes;
        current.colisIn += entry.colisIn ?? 0;
        if (entry.ruptureRefs !== null) {
          current.ruptureRefs = (current.ruptureRefs ?? 0) + entry.ruptureRefs;
        }
      } else {
        byMonth.set(entry.month, { ...entry, colisIn: entry.colisIn ?? 0 });
      }
    }
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export type FlowTotals = {
  orders: number;
  units: number;
  colis: number;
  purchasesHT: number;
  deliveryNotes: number;
  /** Références en rupture au dernier mois de la période ; `null` sans relevé. */
  ruptures: number | null;
};

export function computeTotals(
  countries: readonly FlowSimpleCountryEntry[],
  months: readonly FlowSimpleMonthlyEntry[],
): FlowTotals {
  const latestWithRuptures = [...months].reverse().find((entry) => entry.ruptureRefs !== null);
  return {
    orders: countries.reduce((sum, entry) => sum + entry.ordersIn, 0),
    units: countries.reduce((sum, entry) => sum + entry.unitsIn, 0),
    colis: months.reduce((sum, entry) => sum + entry.colisIn, 0),
    purchasesHT: months.reduce((sum, entry) => sum + entry.purchasesHT, 0),
    deliveryNotes: months.reduce((sum, entry) => sum + entry.deliveryNotes, 0),
    ruptures: latestWithRuptures?.ruptureRefs ?? null,
  };
}
