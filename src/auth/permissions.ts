import type { AppUserRole } from '@/types/user';

/**
 * Rôles « opérations HUB », repris de `isHubOpsRole`
 * (`front_externe_batipower/lib/auth/permissions.ts`).
 */
function isHubOpsRole(role: AppUserRole): boolean {
  return role === 'SUPERADMIN' || role === 'MANAGER';
}

/** Page Préparation du HUB : mêmes rôles que `canAccessHubPreparation` côté web. */
export function canAccessHubPreparation(role: AppUserRole): boolean {
  return isHubOpsRole(role);
}

/**
 * Recherche et fiche produit du HUB : mêmes rôles que `canAccessHubProductSheet` côté
 * web, et que `HUB_PRODUCT_STOCK_ROLES` côté back (`hub-products.controller.ts`).
 * La recherche de commandes, elle, est ouverte à tout compte ayant le module HUB.
 */
export function canAccessHubProductSheet(role: AppUserRole): boolean {
  return isHubOpsRole(role);
}
