import type { Href } from 'expo-router';
import {
  BadgeCheck,
  Handshake,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { canAccessHubPreparation } from '@/auth/permissions';
import type { AppUserRole, BatipowerModule, CurrentUser } from '@/types/user';

/**
 * Registre des modules Batipower, porté de `front_externe_batipower/lib/modules.ts`
 * et `lib/module-access.ts`.
 *
 * `mobileEnabled` pilote ce qui est réellement proposé dans l'app : seul HUB l'est
 * pour l'instant. Pour ouvrir un module : créer `src/app/(app)/<module>/_layout.tsx`
 * (+ ses écrans), faire pointer `landing` vers son écran d'accueil, puis passer
 * `mobileEnabled` à `true`. Le sélecteur de module (`switch-module`) l'intègre seul.
 */
export interface ModuleMeta {
  id: BatipowerModule;
  name: string;
  fullName: string;
  tagline: string;
  icon: LucideIcon;
  /** Fond du badge module. */
  accent: string;
  /** Texte posé sur `accent`. */
  fg: string;
  mobileEnabled: boolean;
  /**
   * Écran d'accueil du module dans l'app, selon le rôle (un module peut proposer un
   * premier écran différent selon les droits). Les modules non ouverts sur mobile
   * mènent à l'écran « bientôt disponible ».
   */
  landing: (role: AppUserRole) => Href;
}

/** Écran d'attente d'un module pas encore disponible sur mobile. */
function comingSoonHref(id: BatipowerModule): Href {
  return { pathname: '/modules/[id]', params: { id } };
}

export const MODULES: Record<BatipowerModule, ModuleMeta> = {
  PARTNER: {
    id: 'PARTNER',
    name: 'PARTNER',
    fullName: 'Batipower PARTNER',
    tagline: 'Espace fournisseurs',
    icon: Handshake,
    accent: '#6C5CE7',
    fg: '#FFFFFF',
    mobileEnabled: false,
    landing: () => comingSoonHref('PARTNER'),
  },
  HUB: {
    id: 'HUB',
    name: 'HUB',
    fullName: 'Batipower HUB',
    tagline: 'Pilotage interne',
    icon: LayoutDashboard,
    accent: '#F97316',
    fg: '#FFFFFF',
    mobileEnabled: true,
    // La préparation est réservée aux opérations ; les autres comptes HUB arrivent sur la recherche.
    landing: (role) => (canAccessHubPreparation(role) ? '/hub/preparation' : '/hub/recherche'),
  },
  MARQUE: {
    id: 'MARQUE',
    name: 'MARQUE',
    fullName: 'Batipower MARQUE',
    tagline: 'Suivi prix des marques',
    icon: BadgeCheck,
    accent: '#C9A227',
    fg: '#0F1111',
    mobileEnabled: false,
    landing: () => comingSoonHref('MARQUE'),
  },
  ADMIN: {
    id: 'ADMIN',
    name: 'ADMIN',
    fullName: 'Batipower ADMIN',
    tagline: 'Administration plateforme',
    icon: ShieldCheck,
    accent: '#DC2626',
    fg: '#FFFFFF',
    mobileEnabled: false,
    landing: () => comingSoonHref('ADMIN'),
  },
  POWER: {
    id: 'POWER',
    name: 'POWER',
    fullName: 'Batipower POWER',
    tagline: 'Veille concurrentielle',
    icon: Zap,
    accent: '#0EA5E9',
    fg: '#FFFFFF',
    mobileEnabled: false,
    landing: () => comingSoonHref('POWER'),
  },
};

export const MODULE_ORDER: readonly BatipowerModule[] = [
  'PARTNER',
  'HUB',
  'MARQUE',
  'POWER',
  'ADMIN',
];

/** Vrai pour un identifiant de module connu (paramètre de route, valeur du back). */
export function isBatipowerModule(value: unknown): value is BatipowerModule {
  return typeof value === 'string' && (MODULE_ORDER as readonly string[]).includes(value);
}

/** JWT antérieur au déploiement des modules, ou liste vide : le parc historique est PARTNER. */
function effectiveModules(modules: BatipowerModule[] | null | undefined): BatipowerModule[] {
  return modules && modules.length > 0 ? modules : ['PARTNER'];
}

/** Modules auxquels l'utilisateur a droit. Le SUPERADMIN les possède tous. */
export function accessibleModules(user: Pick<CurrentUser, 'role' | 'modules'>): BatipowerModule[] {
  if (user.role === 'SUPERADMIN') return [...MODULE_ORDER];
  const owned = effectiveModules(user.modules);
  return MODULE_ORDER.filter((id) => owned.includes(id));
}

/** Modules à la fois autorisés pour l'utilisateur et activés dans l'app mobile. */
export function mobileModules(user: Pick<CurrentUser, 'role' | 'modules'>): BatipowerModule[] {
  return accessibleModules(user).filter((id) => MODULES[id].mobileEnabled);
}

/** Écran d'accueil d'un module pour cet utilisateur. */
export function getModuleHref(id: BatipowerModule, user: Pick<CurrentUser, 'role'>): Href {
  return MODULES[id].landing(user.role);
}

/**
 * Page d'atterrissage après connexion : le module par défaut du compte s'il est
 * disponible sur mobile, sinon le premier module disponible, sinon l'écran
 * « bientôt disponible » du module par défaut (ou du premier module du compte).
 */
export function getLandingHref(user: CurrentUser): Href {
  const available = mobileModules(user);
  const target = available.includes(user.defaultModule) ? user.defaultModule : available[0];
  if (target) return getModuleHref(target, user);

  const owned = accessibleModules(user);
  const fallback = owned.includes(user.defaultModule) ? user.defaultModule : owned[0];
  return comingSoonHref(fallback ?? 'PARTNER');
}
