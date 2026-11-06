import type { AppUserRole } from '@/types/user';

/**
 * Rôles « opérations HUB », repris de `isHubOpsRole`
 * (`front_externe_batipower/lib/auth/permissions.ts`).
 */
function isHubOpsRole(role: AppUserRole): boolean {
  return role === 'SUPERADMIN' || role === 'MANAGER';
}

/**
 * Cockpit du HUB (CA, logistique, SAV, support) : réservé au SUPERADMIN. Le back
 * (`hub-dashboard.controller.ts`) accepte aussi MANAGER sur `overview`, mais le CA, la marge
 * et les délais du support ne sont consultables que par le SUPERADMIN.
 */
export function canAccessHubCockpit(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/** Réglages réservés au SUPERADMIN : impersonation (se connecter en tant qu'un autre compte). */
export function canImpersonate(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
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
