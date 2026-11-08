import { ExternalLink, UserRound } from 'lucide-react-native';

import type { MenuEntry, MenuSectionGroup } from '@/features/menu/types';
import { openWebPage } from '@/lib/openWeb';
import type { AppUserRole } from '@/types/user';

type PartnerMenuEntry = MenuEntry & { section: string };

/**
 * Pages secondaires du module PARTNER, hors barre d'onglets (Produits, Opportunités,
 * Inter-agences, BL à corriger). Le reste de l'espace fournisseurs (remises en stock, devis,
 * logistique…) reste sur le web.
 */
const ENTRIES: readonly PartnerMenuEntry[] = [
  { id: 'profil', section: 'Compte', label: 'Profil', icon: UserRound, href: '/partner/profil' },
  {
    id: 'web',
    section: 'Compte',
    label: "Ouvrir l'espace web",
    icon: ExternalLink,
    action: () => void openWebPage('/'),
  },
];

const SECTIONS = ['Compte'] as const;

/** Entrées du menu PARTNER accessibles au rôle, groupées par section (sections vides omises). */
export function partnerMenuSectionsFor(_role: AppUserRole): MenuSectionGroup[] {
  return SECTIONS.map((section) => ({
    section,
    entries: ENTRIES.filter((entry) => entry.section === section),
  })).filter((group) => group.entries.length > 0);
}
