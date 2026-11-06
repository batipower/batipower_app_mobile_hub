import type { Href } from 'expo-router';
import {
  BadgeCheck,
  Handshake,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import type { BatipowerModule, CurrentUser } from '@/types/user';

/**
 * Registre des modules Batipower, porté de `front_externe_batipower/lib/modules.ts`
 * et `lib/module-access.ts`.
 *
 * `mobileEnabled` pilote ce qui est réellement proposé dans l'app : seul HUB l'est
 * pour l'instant. Pour ouvrir un module : créer `src/app/(app)/<route>/_layout.tsx`
 * (+ ses écrans), renseigner `route`, puis passer `mobileEnabled` à `true`.
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
  /** Page d'accueil du module dans l'app (segment sous `(app)`). */
  route: Href;
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
    route: '/module-indisponible',
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
    route: '/hub',
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
    route: '/module-indisponible',
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
    route: '/module-indisponible',
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
    route: '/module-indisponible',
  },
};

export const MODULE_ORDER: readonly BatipowerModule[] = [
  'PARTNER',
  'HUB',
  'MARQUE',
  'POWER',
  'ADMIN',
];

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

/**
 * Page d'atterrissage après connexion : le module par défaut du compte s'il est
 * disponible sur mobile, sinon le premier module disponible, sinon l'écran
 * « module indisponible ».
 */
export function getLandingHref(user: CurrentUser): Href {
  const available = mobileModules(user);
  const target = available.includes(user.defaultModule) ? user.defaultModule : available[0];
  return target ? MODULES[target].route : '/module-indisponible';
}
