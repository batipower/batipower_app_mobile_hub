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
 * Contrôle des annulations du HUB (`/hub/controle-annulations` côté web) : SUPERADMIN et MANAGER.
 * Le MANAGER re-vérifie ou ignore ; la validation des avoirs est réservée au SUPERADMIN.
 */
export function canAccessHubCancellationControl(role: AppUserRole): boolean {
  return isHubOpsRole(role);
}

/** Re-vérifier / Ignorer une alerte d'annulation : mêmes rôles que le web (HUB et SUPERADMIN). */
export function canRecheckOrIgnoreCancellation(role: AppUserRole): boolean {
  return isHubOpsRole(role);
}

/**
 * Valider l'avoir (facture antérieure), valider la déclaration « Avoir fait » ou la remettre à
 * revoir : SUPERADMIN, comme les `@Roles` du back.
 */
export function canReviewCreditNote(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
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

/**
 * Module ADMIN (comptes, inscriptions, plateforme, distributeurs) : SUPERADMIN uniquement, comme
 * `canAccessRoute('/super-admin/*')` côté web et `@Roles(SUPERADMIN)` des contrôleurs `buyer-app/admin/*`.
 */
export function canAccessAdmin(role: AppUserRole): boolean {
  return role === 'SUPERADMIN';
}

// ─── Module PARTNER (espace fournisseurs) ────────────────────────────────────

/** Compte tel que le jugent les règles PARTNER : rôle et drapeaux de périmètre de `GET /buyer-app/me`. */
export type PartnerAccessUser = {
  role: AppUserRole;
  opportunityOpenAccess?: boolean;
  productsCatalogAccess?: boolean;
} | null | undefined;

/**
 * Rôles du catalogue Produits et des inter-agences : `BUYER_PRODUCT_ROLES` de
 * `buyer-products.controller.ts` et `INTER_AGENCY_ORDERS_ROLES` du web.
 */
const PARTNER_BUYER_ROLES: readonly AppUserRole[] = [
  'ACHETEUR',
  'CHEF_SERVICE',
  'RESPONSABLE_ACHAT',
  'RESPONSABLE_ACHAT_REFERENT',
  'RESPONSABLE_PLATEFORME',
  'RESPONSABLE',
  'SUPERADMIN',
];

/**
 * Rôles des opportunités et des BL à corriger : `NEGOTIATION_OPPORTUNITY_ROLES` et
 * `DELIVERY_NOTE_PRICING_ROLES` du web (RA, RAR, SUPERADMIN).
 */
const PARTNER_PURCHASE_ROLES: readonly AppUserRole[] = [
  'RESPONSABLE_ACHAT',
  'RESPONSABLE_ACHAT_REFERENT',
  'SUPERADMIN',
];

/**
 * Distributeur limité à ses DEP (`opportunityAccess = DEP_ONLY`) : le back renvoie
 * `opportunityOpenAccess = false` (jamais pour un compte HUB). Absent = pas DEP_ONLY.
 */
export function isDepOnlyUser(user: PartnerAccessUser): boolean {
  return user?.opportunityOpenAccess === false;
}

/** Produits (liste DEP, et standard si le catalogue est ouvert au compte). */
export function canAccessPartnerProducts(role: AppUserRole): boolean {
  return PARTNER_BUYER_ROLES.includes(role);
}

/** Segment « Standard » des Produits : fermé aux comptes dont `productsCatalogAccess` vaut `false`. */
export function canAccessPartnerProductsCatalog(user: PartnerAccessUser): boolean {
  return !!user && canAccessPartnerProducts(user.role) && user.productsCatalogAccess !== false;
}

/** Opportunités (standard et DEP). */
export function canAccessPartnerOpportunities(role: AppUserRole): boolean {
  return PARTNER_PURCHASE_ROLES.includes(role);
}

/** Segment « Standard » des opportunités : absent pour un distributeur DEP_ONLY. */
export function canAccessPartnerOpportunitiesStandard(user: PartnerAccessUser): boolean {
  return !!user && canAccessPartnerOpportunities(user.role) && !isDepOnlyUser(user);
}

/** Inter-agences : mêmes rôles que les produits, sauf distributeur DEP_ONLY. */
export function canAccessPartnerInterAgency(user: PartnerAccessUser): boolean {
  return !!user && canAccessPartnerProducts(user.role) && !isDepOnlyUser(user);
}

/** BL à corriger (écarts de prix d'achat). */
export function canAccessPartnerDeliveryNotes(role: AppUserRole): boolean {
  return PARTNER_PURCHASE_ROLES.includes(role);
}

/** Onglets du module PARTNER sur mobile, dans l'ordre de la barre. */
export type PartnerTab = 'produits' | 'opportunites' | 'inter-agences' | 'bl';

/** Onglets PARTNER auxquels le compte a droit ; vide = le module n'a rien à lui montrer sur mobile. */
export function partnerTabsFor(user: PartnerAccessUser): PartnerTab[] {
  if (!user) return [];
  const tabs: PartnerTab[] = [];
  if (canAccessPartnerProducts(user.role)) tabs.push('produits');
  if (canAccessPartnerOpportunities(user.role)) tabs.push('opportunites');
  if (canAccessPartnerInterAgency(user)) tabs.push('inter-agences');
  if (canAccessPartnerDeliveryNotes(user.role)) tabs.push('bl');
  return tabs;
}

/**
 * Premier onglet PARTNER d'un compte, comme `getDefaultLandingPage` du web : les Produits, sauf un
 * RA / RAR distributeur DEP_ONLY, qui arrive sur les Opportunités DEP.
 */
export function partnerLandingTab(user: PartnerAccessUser): PartnerTab | null {
  const tabs = partnerTabsFor(user);
  if (tabs.length === 0) return null;
  if (isDepOnlyUser(user) && tabs.includes('opportunites')) return 'opportunites';
  return tabs[0] ?? null;
}
