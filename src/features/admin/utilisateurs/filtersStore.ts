import { useSyncExternalStore } from 'react';

import type { AppUserRole } from '@/types/user';

/**
 * Filtres de la liste des utilisateurs, tenus dans un store de module : la liste et la feuille de
 * filtres sont des routes distinctes qui doivent les partager (même principe que `returns/filtersStore`).
 * La recherche vit dans la barre native de la liste. Remis à zéro à la déconnexion.
 */
export type AdminUsersFilters = {
  role: AppUserRole | '';
  /** Clé d'entrepôt (valeur de l'enum ou code d'un entrepôt libre), vide = tous. */
  warehouse: string;
  /** Id de filiale, `UNASSIGNED` (partenaires non rattachés) ou vide = toutes. */
  subsidiary: string;
  categories: string[];
};

export const UNASSIGNED_SUBSIDIARY = 'UNASSIGNED';

export const DEFAULT_ADMIN_USERS_FILTERS: AdminUsersFilters = {
  role: '',
  warehouse: '',
  subsidiary: '',
  categories: [],
};

let state: AdminUsersFilters = DEFAULT_ADMIN_USERS_FILTERS;
const listeners = new Set<() => void>();

function emit(next: AdminUsersFilters) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

export function useAdminUsersFilters(): AdminUsersFilters {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function patchAdminUsersFilters(partial: Partial<AdminUsersFilters>) {
  emit({ ...state, ...partial });
}

export function resetAdminUsersFilters() {
  emit(DEFAULT_ADMIN_USERS_FILTERS);
}

export function countActiveAdminUsersFilters(filters: AdminUsersFilters): number {
  return (
    (filters.role ? 1 : 0) +
    (filters.warehouse ? 1 : 0) +
    (filters.subsidiary ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0)
  );
}
