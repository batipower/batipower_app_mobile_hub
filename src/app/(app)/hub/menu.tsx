import { MenuSheet } from '@/features/menu/MenuSheet';
import { menuSectionsFor } from '@/features/menu/hubMenu';

/**
 * Feuille de menu du HUB (mi-écran), ouverte par l'onglet Menu. Elle suit le thème choisi dans
 * l'app (clair, sombre ou auto) via le `AppThemeProvider` racine : aucun thème n'y est forcé.
 */
export default function MenuRoute() {
  return <MenuSheet module="HUB" sectionsFor={menuSectionsFor} />;
}
