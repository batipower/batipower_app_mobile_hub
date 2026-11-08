import type { AdminUser } from '@/types/admin';

import {
  WAREHOUSE_SCOPED_ROLES,
  effectiveModules,
  needsSubsidiary,
  warehouseLabel,
} from '../shared/accessRules';
import { UNASSIGNED_SUBSIDIARY, type AdminUsersFilters } from './filtersStore';

/**
 * Entrepôt effectif d'un compte : la valeur stockée, sinon celle de la filiale (entrepôt historique
 * ou libre, ex. LILLE). `derived` = pas encore écrit sur le compte, le back l'écrira à l'enregistrement.
 */
export function userWarehouseView(
  user: Pick<AdminUser, 'role' | 'warehouse' | 'distributorWarehouse'>,
): { key: string; label: string; derived: boolean } | null {
  const dw = user.distributorWarehouse;
  const stored: string | null = user.warehouse;
  // Hors rôles à entrepôt, la filiale ne détermine pas d'entrepôt de compte : on n'invente rien.
  const fallback = WAREHOUSE_SCOPED_ROLES.includes(user.role) ? (dw?.warehouse || dw?.code || null) : null;
  const key = stored || fallback;
  if (!key) return null;
  const known = warehouseLabel(key);
  const label = known !== key ? known : dw && (dw.code ?? dw.warehouse) === key && dw.name ? dw.name : key;
  return { key, label, derived: !stored };
}

/** Partenaire (module PARTNER, hors SUPERADMIN) sans filiale : à rattacher. */
export function isUnassignedPartner(user: AdminUser): boolean {
  return !user.subsidiary && needsSubsidiary(user.role, effectiveModules(user.modules));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Recherche (e-mail, nom, code, marques) et filtres de la liste, comme la page web. */
export function filterUsers(users: AdminUser[], search: string, filters: AdminUsersFilters): AdminUser[] {
  const q = normalize(search.trim());
  return users.filter((u) => {
    if (q) {
      const matches =
        normalize(u.email).includes(q) ||
        normalize(u.name).includes(q) ||
        normalize(u.code ?? '').includes(q) ||
        (u.brands ?? []).some((b) => normalize(b).includes(q));
      if (!matches) return false;
    }
    if (filters.role && u.role !== filters.role) return false;
    if (filters.warehouse && userWarehouseView(u)?.key !== filters.warehouse) return false;
    if (filters.subsidiary === UNASSIGNED_SUBSIDIARY) {
      if (!isUnassignedPartner(u)) return false;
    } else if (filters.subsidiary && u.subsidiaryId !== filters.subsidiary) {
      return false;
    }
    if (filters.categories.length && !filters.categories.some((c) => u.categoryTypes.includes(c))) {
      return false;
    }
    return true;
  });
}

/** Les vacances se déclarent à la main pour les acheteurs et chefs de service actifs. */
export function canToggleUserVacation(user: AdminUser): boolean {
  return (user.role === 'ACHETEUR' || user.role === 'CHEF_SERVICE') && user.isActive;
}
