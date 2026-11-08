import { warehouseSupportsEbatpro } from '../shared/accessRules';
import { formatDateTime } from '@/lib/format';
import type { AdminDistributor, AdminDistributorWarehouse } from '@/types/adminPartners';

import { normalizeForSearch } from '@/features/preparation/orderHelpers';

/** Réseaux historiques : couper leur affectation change le quotidien du HUB, confirmation renforcée. */
export const SENSITIVE_DISTRIBUTOR_SLUGS = ['mequisa', 'aubade'];

/** Entrepôts historiques : leur statut Prestashop est fixé dans le code (non modifiable ici). */
export const LEGACY_PS_STATE_WAREHOUSES = ['FLEVY', 'DOMBASLE', 'QG_BATIPOWER'];

export type DistributorFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'incomplete'
  | 'ordersClosed'
  | 'negoPaused'
  | 'depOnly';

export const FILTER_LABELS: readonly { key: DistributorFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'inactive', label: 'Inactifs' },
  { key: 'incomplete', label: 'Config incomplète' },
  { key: 'ordersClosed', label: 'Commandes coupées' },
  { key: 'negoPaused', label: 'Déploiement en pause' },
  { key: 'depOnly', label: 'DEP uniquement' },
];

export function distributorAlerts(d: AdminDistributor) {
  return {
    /** Entrepôt ou compte eBatPro manquant : pas de prix proposé sur les opportunités DEP. */
    incomplete: d.ebatproSetup ? !d.ebatproSetup.ready : false,
    ordersClosed: d.ordersAffectationEnabled === false,
    negoPaused: d.negoAutoDeployPaused === true,
  };
}

export function matchesFilter(d: AdminDistributor, filter: DistributorFilter): boolean {
  switch (filter) {
    case 'active':
      return d.isActive;
    case 'inactive':
      return !d.isActive;
    case 'incomplete':
      return distributorAlerts(d).incomplete;
    case 'ordersClosed':
      return distributorAlerts(d).ordersClosed;
    case 'negoPaused':
      return distributorAlerts(d).negoPaused;
    case 'depOnly':
      return d.opportunityAccess === 'DEP_ONLY';
    default:
      return true;
  }
}

/** Recherche locale : distributeur, entrepôts (nom, code) et filiales. */
export function matchesSearch(d: AdminDistributor, query: string): boolean {
  const q = normalizeForSearch(query.trim());
  if (!q) return true;
  const haystack = normalizeForSearch(
    [d.name, d.slug, ...d.warehouses.flatMap((w) => [w.name, w.code ?? '', ...w.subsidiaries.map((s) => s.name)])].join(' '),
  );
  return haystack.includes(q);
}

export function formatTrace(at?: string | null, by?: string | null): string | null {
  const when = formatDateTime(at);
  if (!when) return null;
  return by ? `Modifié le ${when} par ${by}` : `Modifié le ${when}`;
}

/** Valeur affichée : « 7 % », « 7,5 % ». */
export function formatPct(value: number): string {
  return `${String(Math.round(value * 10) / 10).replace('.', ',')} %`;
}

/** Entrepôts sans interrupteur : QG toujours affectable, Nancy / FBA jamais, lien secondaire = principal. */
export function fixedWarehouseNote(w: AdminDistributorWarehouse): string | null {
  const fixed: Record<string, string> = {
    QG_BATIPOWER: 'Toujours affectable : repli de Bertrand en cas de doute (non désactivable).',
    NANCY: 'Jamais affecté directement : partage les DEP de Dombasle.',
    FBA_AMAZON: 'Jamais affecté directement.',
  };
  if (w.warehouse && fixed[w.warehouse]) return fixed[w.warehouse] ?? null;
  if (w.warehouse && w.code && w.code !== w.warehouse) return 'Lien secondaire : réglé par l’entrepôt principal.';
  return null;
}

export function totalPendingOrders(d: AdminDistributor): number {
  return d.warehouses.reduce((sum, w) => sum + (w.pendingOrders ?? 0), 0);
}

/** Entrepôts liés à l'enum historique : leur configuration pilote le HUB au quotidien. */
export function isLegacyWarehouse(w: AdminDistributorWarehouse): boolean {
  return !!w.warehouse;
}

/** Un entrepôt eBatPro sans compte actif : le distributeur n'est pas prêt à proposer un prix DEP. */
export function warehouseMissingAccount(
  w: AdminDistributorWarehouse,
  accounts: { distributorWarehouseId: string | null; isActive: boolean }[],
): boolean {
  return (
    warehouseSupportsEbatpro(w.warehouse) &&
    !accounts.some((a) => a.distributorWarehouseId === w.id && a.isActive)
  );
}

export const SETUP_MISSING_LABELS = {
  WAREHOUSE: 'entrepôt manquant',
  EBAT_ACCOUNT: 'compte eBatPro manquant',
} as const;
