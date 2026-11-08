import {
  Activity,
  Clock,
  ExternalLink,
  KeyRound,
  Landmark,
  ShieldAlert,
  UserRound,
} from 'lucide-react-native';

import type { MenuEntry, MenuSectionGroup } from '@/features/menu/types';
import { openWebPage } from '@/lib/openWeb';
import type { AppUserRole } from '@/types/user';

import { canAccessAdmin } from '@/auth/permissions';

type AdminMenuEntry = MenuEntry & { section: string };

/**
 * Pages secondaires du module ADMIN, hors barre d'onglets (Utilisateurs, Inscriptions,
 * Partenaires, Plateforme). Nommées comme les groupes de la sidebar ADMIN du web.
 */
const ENTRIES: readonly AdminMenuEntry[] = [
  {
    id: 'activite',
    section: 'Comptes',
    label: 'Activité utilisateurs',
    icon: Activity,
    href: '/admin/activite',
  },
  {
    id: 'maintenance',
    section: 'Plateforme',
    label: 'Maintenance',
    icon: ShieldAlert,
    href: '/admin/plateforme/maintenance',
  },
  {
    id: 'horaires',
    section: 'Plateforme',
    label: 'Horaires du support',
    icon: Clock,
    href: '/admin/plateforme/horaires',
  },
  {
    id: 'rib',
    section: 'Plateforme',
    label: 'RIB devis',
    icon: Landmark,
    href: '/admin/plateforme/rib',
  },
  {
    id: 'cles-api',
    section: 'Plateforme',
    label: 'Clés API',
    icon: KeyRound,
    href: '/admin/plateforme/cles-api',
  },
  {
    id: 'profil',
    section: 'Compte',
    label: 'Profil',
    icon: UserRound,
    href: '/hub/profil',
  },
  {
    id: 'web',
    section: 'Compte',
    label: "Ouvrir l'espace web",
    icon: ExternalLink,
    action: () => void openWebPage('/super-admin/utilisateurs'),
  },
];

const SECTIONS = ['Comptes', 'Plateforme', 'Compte'] as const;

/** Entrées du menu ADMIN accessibles au rôle, groupées par section (sections vides omises). */
export function adminMenuSectionsFor(role: AppUserRole): MenuSectionGroup[] {
  if (!canAccessAdmin(role)) return [];
  return SECTIONS.map((section) => ({
    section,
    entries: ENTRIES.filter((entry) => entry.section === section),
  })).filter((group) => group.entries.length > 0);
}
