import type { Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';

/** Ligne d'un menu de module : une page à pousser (`href`) ou une action libre (`action`). */
export type MenuEntry = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: Href;
  action?: () => void;
  /** L'entrée est un onglet : on y bascule (`navigate`) au lieu de pousser une page par-dessus. */
  tab?: boolean;
};

/** Section d'un menu de module, avec ses lignes déjà filtrées pour le rôle. */
export type MenuSectionGroup = { section: string; entries: MenuEntry[] };
