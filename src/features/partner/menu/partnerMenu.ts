import { ExternalLink, UserRound, Workflow } from 'lucide-react-native';

import { canViewPartnerFlowDashboard } from '@/auth/permissions';
import type { MenuEntry, MenuSectionGroup } from '@/features/menu/types';
import { openWebPage } from '@/lib/openWeb';
import type { AppUserRole } from '@/types/user';

type PartnerMenuEntry = MenuEntry & {
  section: string;
  /** Entrée visible pour ce rôle (absent = tous les comptes du module). */
  visible?: (role: AppUserRole) => boolean;
};

/**
 * Pages secondaires du module PARTNER, hors barre d'onglets (Produits, Opportunités,
 * Inter-agences, BL à corriger). Le reste de l'espace fournisseurs (remises en stock, devis,
 * logistique…) reste sur le web.
 */
const ENTRIES: readonly PartnerMenuEntry[] = [
  {
    id: 'flux',
    section: 'Pilotage',
    label: 'Dashboard flux',
    icon: Workflow,
    href: '/partner/flux',
    visible: canViewPartnerFlowDashboard,
  },
  { id: 'profil', section: 'Compte', label: 'Profil', icon: UserRound, href: '/partner/profil' },
  {
    id: 'web',
    section: 'Compte',
    label: "Ouvrir l'espace web",
    icon: ExternalLink,
    action: () => void openWebPage('/'),
  },
];

const SECTIONS = ['Pilotage', 'Compte'] as const;

/** Entrées du menu PARTNER accessibles au rôle, groupées par section (sections vides omises). */
export function partnerMenuSectionsFor(role: AppUserRole): MenuSectionGroup[] {
  return SECTIONS.map((section) => ({
    section,
    entries: ENTRIES.filter(
      (entry) => entry.section === section && (entry.visible?.(role) ?? true),
    ).map(({ section: _section, visible: _visible, ...entry }) => entry),
  })).filter((group) => group.entries.length > 0);
}
