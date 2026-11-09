import type { Href } from 'expo-router';
import {
  BadgeEuro,
  PackageCheck,
  Percent,
  ScanSearch,
  Search,
  ShieldAlert,
  Undo2,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';

import {
  canAccessHubBrandMargin,
  canAccessHubCancellationControl,
  canAccessHubCustomerQuotes,
  canAccessHubPalletFlow,
  canAccessHubPricing,
  canAccessHubProductAnalyzer,
  canAccessHubReturns,
} from '@/auth/permissions';
import type { AppUserRole } from '@/types/user';

/** Sections du menu, nommées comme les groupes de la sidebar HUB du web. */
export type HubMenuSection = 'Opérations' | 'Pilotage' | 'Compte';

export type HubMenuEntry = {
  id: string;
  section: HubMenuSection;
  label: string;
  icon: LucideIcon;
  href: Href;
  /** L'entrée est un onglet : on y bascule (`navigate`) au lieu de pousser une page par-dessus. */
  tab?: boolean;
  /** Entrée visible pour ce rôle : une page interdite n'apparaît pas dans le menu. */
  visible: (role: AppUserRole) => boolean;
};

/** Ordre d'affichage des sections du menu. */
export const HUB_MENU_SECTIONS: readonly HubMenuSection[] = ['Opérations', 'Pilotage', 'Compte'];

/**
 * Pages secondaires du HUB, hors barre d'onglets. Ajouter une page = une entrée ici + une
 * route dans `src/app/(app)/hub/` (déclarée dans son `_layout.tsx`).
 */
export const HUB_MENU_ENTRIES: readonly HubMenuEntry[] = [
  {
    // Pour le SUPERADMIN, l'onglet Devis a pris la place de Recherche dans la barre.
    id: 'recherche',
    section: 'Opérations',
    label: 'Recherche',
    icon: Search,
    href: '/hub/recherche',
    tab: true,
    visible: canAccessHubCustomerQuotes,
  },
  {
    id: 'retours',
    section: 'Opérations',
    label: 'Retours',
    icon: Undo2,
    href: '/hub/retours',
    visible: canAccessHubReturns,
  },
  {
    // Le web la masque pour le SUPERADMIN (accès par la cloche, absente de l'app mobile).
    id: 'controle-annulations',
    section: 'Opérations',
    label: 'Contrôle annulations',
    icon: ShieldAlert,
    href: '/hub/controle-annulations',
    visible: canAccessHubCancellationControl,
  },
  {
    id: 'candidats-palette',
    section: 'Opérations',
    label: 'Candidats palette',
    icon: PackageCheck,
    href: '/hub/candidats-palette',
    visible: canAccessHubPalletFlow,
  },
  {
    id: 'pricing',
    section: 'Pilotage',
    label: 'Pricing',
    icon: BadgeEuro,
    href: '/hub/pricing',
    visible: canAccessHubPricing,
  },
  {
    id: 'marges-marques',
    section: 'Pilotage',
    label: 'Marges marques',
    icon: Percent,
    href: '/hub/marges-marques',
    visible: canAccessHubBrandMargin,
  },
  {
    id: 'product-analyzer',
    section: 'Pilotage',
    label: 'Product Analyzer',
    icon: ScanSearch,
    href: '/hub/product-analyzer',
    visible: canAccessHubProductAnalyzer,
  },
  {
    id: 'profil',
    section: 'Compte',
    label: 'Profil',
    icon: UserRound,
    href: '/hub/profil',
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
