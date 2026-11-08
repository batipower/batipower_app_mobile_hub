import type { CurrentUser } from '@/types/user';
import type { InterAgencyOrder } from '@/types/partnerInterAgency';

import type { InterAgencyOrderStatus } from './constants';
import type { InterAgencyFilters, InterAgencyStatusFilter } from './filtersStore';

/** Entrepôts du workflow : un compte non SUPERADMIN rattaché à l'un d'eux n'en voit pas d'autre (comme le web). */
const WORKFLOW_WAREHOUSES = ['FLEVY', 'DOMBASLE'];

export function interAgencyStatus(order: InterAgencyOrder): InterAgencyOrderStatus {
  if (order.interAgencyImpossible) return 'IMPOSSIBLE';
  if (order.interAgencyDone) return 'DONE';
  return 'TODO';
}

/** Libellé affiché d'une commande : la référence eBat, à défaut celle de la boutique. */
export function orderLabel(order: InterAgencyOrder): string {
  return order.ebatRef || order.reference;
}

/** Jours écoulés depuis la création (à minuit), pour le badge d'ancienneté. */
export function daysSince(iso: string, now = new Date()): number {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 0;
  date.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
}

export function ageLabel(days: number): string {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `${days} j`;
}

/** Entrepôt imposé au compte (aucun choix possible), sinon `null`. */
export function lockedWarehouseFor(user: CurrentUser | null): string | null {
  if (!user || user.role === 'SUPERADMIN' || !user.warehouse) return null;
  return WORKFLOW_WAREHOUSES.includes(user.warehouse) ? user.warehouse : null;
}

/** Filtre « mes commandes » effectif : l'ACHETEUR l'a par défaut tant qu'il n'a rien choisi. */
export function isMineOnly(filters: InterAgencyFilters, user: CurrentUser | null): boolean {
  return filters.mineOnly ?? user?.role === 'ACHETEUR';
}

function isMine(order: InterAgencyOrder, user: CurrentUser | null): boolean {
  if (!user) return false;
  return order.buyers.some((buyer) => buyer.id === user.id || (!!user.code && buyer.code === user.code));
}

function matchesSearch(order: InterAgencyOrder, term: string): boolean {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = [
    order.reference,
    order.ebatRef,
    order.distributorName,
    ...order.buyers.flatMap((buyer) => [buyer.name, buyer.code]),
    ...order.rows.flatMap((row) => [row.reference, row.name]),
  ];
  return haystack.some((value) => !!value && value.toLowerCase().includes(needle));
}

/**
 * Commandes visibles : entrepôt, « mes commandes » et recherche, avant le statut (qui sert aux
 * compteurs des puces, calculés sur ce même périmètre).
 */
export function scopeOrders(
  orders: readonly InterAgencyOrder[],
  filters: InterAgencyFilters,
  user: CurrentUser | null,
  term: string,
): InterAgencyOrder[] {
  const locked = lockedWarehouseFor(user);
  const warehouse = locked ?? filters.warehouse;
  const mine = isMineOnly(filters, user);
  return orders.filter(
    (order) =>
      (!warehouse || order.warehouseAffectation === warehouse) &&
      (!mine || isMine(order, user)) &&
      matchesSearch(order, term),
  );
}

export function countByStatus(
  orders: readonly InterAgencyOrder[],
): Record<InterAgencyStatusFilter, number> {
  const counts: Record<InterAgencyStatusFilter, number> = {
    ALL: orders.length,
    TODO: 0,
    DONE: 0,
    IMPOSSIBLE: 0,
  };
  for (const order of orders) counts[interAgencyStatus(order)] += 1;
  return counts;
}
