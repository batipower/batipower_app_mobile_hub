import type { Href } from 'expo-router';
import { CircleDollarSign, UserRound, type LucideIcon } from 'lucide-react-native';

import { canAccessHubPricing } from '@/auth/permissions';
import type { AppUserRole } from '@/types/user';

export type HubMenuSection = 'Catalogue' | 'Pilotage' | 'Compte';

export type HubMenuEntry = {
  id: string;
  section: HubMenuSection;
  label: string;
  description: string;
  icon: LucideIcon;
  href: Href;
  /** Entrée visible pour ce rôle : une page interdite n'apparaît pas dans le menu. */
  visible: (role: AppUserRole) => boolean;
};

/** Ordre d'affichage des sections du menu. */
export const HUB_MENU_SECTIONS: readonly HubMenuSection[] = ['Catalogue', 'Pilotage', 'Compte'];

/**
 * Pages secondaires du HUB, hors barre d'onglets. Ajouter une page = une entrée ici + une
 * route dans `src/app/(app)/hub/menu/` (déclarée dans son `_layout.tsx`).
 */
export const HUB_MENU_ENTRIES: readonly HubMenuEntry[] = [
  {
    id: 'pricing',
    section: 'Catalogue',
    label: 'Pricing',
    description: 'Prix, stocks, BuyBox et marges du catalogue',
    icon: CircleDollarSign,
    href: '/hub/menu/pricing',
    visible: canAccessHubPricing,
  },
  {
    id: 'profil',
    section: 'Compte',
    label: 'Profil',
    description: 'Compte, apparence, changement de module',
    icon: UserRound,
    href: '/hub/menu/profil',
    visible: () => true,
  },
];

/** Entrées accessibles au rôle, groupées par section (sections vides omises). */
export function menuSectionsFor(role: AppUserRole) {
  return HUB_MENU_SECTIONS.map((section) => ({
    section,
    entries: HUB_MENU_ENTRIES.filter((entry) => entry.section === section && entry.visible(role)),
  })).filter((group) => group.entries.length > 0);
}
