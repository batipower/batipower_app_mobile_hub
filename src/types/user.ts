/**
 * Types du compte utilisateur, alignés sur `CurrentUser` du front externe
 * (`front_externe_batipower/lib/types.ts`) et sur la réponse de `GET /buyer-app/me`.
 * Seuls les champs utiles à l'app mobile sont modélisés ; l'API peut en renvoyer d'autres.
 */

export type BatipowerModule = 'PARTNER' | 'HUB' | 'MARQUE' | 'ADMIN' | 'POWER';

export type AppUserRole =
  | 'ACHETEUR'
  | 'CHEF_SERVICE'
  | 'RESPONSABLE_ACHAT'
  | 'RESPONSABLE_ACHAT_REFERENT'
  | 'LOGISTIQUE'
  | 'RESPONSABLE_PLATEFORME'
  | 'RESPONSABLE'
  | 'SUPERADMIN'
  | 'PREPARATEUR'
  | 'RESPONSABLE_EXPEDITION_PALETTE'
  | 'DIRECTION'
  | 'MANAGER'
  | 'RESPONSABLE_MARQUE'
  | 'VERIFICATEUR_BL';

/** Référence légère vers une filiale ou un distributeur de rattachement. */
export interface PartnerRef {
  id: string;
  name: string;
  slug: string;
}

/**
 * Compte listé par `GET /buyer-app/impersonate/users` (même forme que l'admin des
 * utilisateurs du web) : de quoi choisir et reconnaître le compte à usurper.
 */
export interface ImpersonableUser {
  id: string;
  email: string;
  name: string;
  code: string | null;
  role: AppUserRole;
  modules: BatipowerModule[];
  defaultModule: BatipowerModule;
  warehouse: string | null;
  isActive: boolean;
  isOnVacation: boolean;
  lastLoginAt: string | null;
  subsidiary?: PartnerRef | null;
  partnerDistributor?: PartnerRef | null;
}

export interface CurrentUser {
  id: string;
  /** `scraper` : session à périmètre réduit (clé API de l'extension), jamais émise au mobile. */
  scope?: 'scraper';
  email: string;
  name: string;
  code: string | null;
  role: AppUserRole;
  modules: BatipowerModule[];
  defaultModule: BatipowerModule;
  /** Entrepôt du compte : peut être le code d'un entrepôt libre de filiale, donc simple chaîne. */
  warehouse: string | null;
  mustChangePassword: boolean;
  isOnVacation: boolean;
  lastLoginAt: string | null;
  introSeenAt?: string | null;
  impersonatedBy?: string | null;
  /** `false` pour un distributeur limité à ses DEP (jamais pour un compte HUB) ; absent = accès complet. */
  opportunityOpenAccess?: boolean;
  subsidiaryId: string | null;
  subsidiary: PartnerRef | null;
  partnerDistributor: PartnerRef | null;
  distributorWarehouse: {
    id: string;
    name?: string;
    warehouse: string | null;
    code?: string | null;
  } | null;
}
