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

/** Vue « Site » de l'accueil HUB (notes, ruptures, palmarès avec marges) : SUPERADMIN. */
export function canAccessHubWebsiteDashboard(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/** Vue « Stats PARTNER » de l'accueil HUB : SUPERADMIN (`@Roles` de `hub-partner-stats.controller.ts`). */
export function canAccessHubPartnerStats(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/** Vue « Financier » de l'accueil HUB (P&L, Teogest) : SUPERADMIN, comme `canViewHubFinance` du web. */
export function canViewHubFinance(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/** Réglages réservés au SUPERADMIN : impersonation (se connecter en tant qu'un autre compte). */
export function canImpersonate(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/**
 * Liste Pricing du HUB (prix d'achat, marges, BuyBox) : SUPERADMIN uniquement, comme
 * `canAccessHubPricing` côté web et `@Roles(SUPERADMIN)` de `hub-pricing.controller.ts`.
 */
export function canAccessHubPricing(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/**
 * Page « Marges marques » du HUB (marge par marque, produits, commandes, SAV) : SUPERADMIN
 * uniquement, comme `canAccessHubBrandMargin` côté web et `@Roles(SUPERADMIN)` de
 * `hub-brand-margin.controller.ts`.
 */
export function canAccessHubBrandMargin(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/**
 * Product Analyzer du HUB (analyse de produits, historique, négociation) : SUPERADMIN uniquement,
 * comme `canAccessHubProductAnalyzer` côté web.
 */
export function canAccessHubProductAnalyzer(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/** Page Préparation du HUB : mêmes rôles que `canAccessHubPreparation` côté web. */
export function canAccessHubPreparation(role: AppUserRole): boolean {
  return isHubOpsRole(role);
}

/**
 * Retours de commande du HUB (historique, réception) : SUPERADMIN et MANAGER, comme `@Roles` de
 * `GET hub-app/returns/history`. Les actions de la fiche (réception, état, remarque) ne portent pas
 * de `@Roles` côté back : c'est donc l'accès à la page qui les limite à ces deux rôles.
 */
export function canAccessHubReturns(role: AppUserRole): boolean {
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

/**
 * Joindre une carte opportunité à un message d'équipe : SUPERADMIN uniquement, comme
 * `canAttachOpportunity` de la page web des discussions.
 */
export function canAttachOpportunities(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

/**
 * Joindre une carte renégociation : tout rôle sauf un distributeur « DEP uniquement »
 * (`opportunityOpenAccess === false`, cf. `isDepOnlyUser` du web), comme `canAttachRenegotiation`
 * de la page web des discussions.
 */
export function canAttachRenegotiations(
  user: { role: AppUserRole; opportunityOpenAccess?: boolean } | null | undefined,
): boolean {
  return !!user && user.opportunityOpenAccess !== false;
}

/**
 * Devis clients du HUB (demandes, devis, envoi, commande PrestaShop) : SUPERADMIN uniquement
 * pour l'instant, comme `@Roles(SUPERADMIN)` de `hub-customer-quotes.controller.ts`.
 */
export function canAccessHubCustomerQuotes(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}
