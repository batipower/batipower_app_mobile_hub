import { MenuSheet } from '@/features/menu/MenuSheet';
import { ForcedTheme } from '@/theme';

/**
 * Feuille de menu du HUB (mi-écran), ouverte par l'onglet Menu. Elle garde l'identité sombre de
 * la sidebar web quelle que soit l'apparence choisie : les composants y reçoivent le thème sombre.
 */
export default function MenuRoute() {
  return (
    <ForcedTheme scheme="dark">
      <MenuSheet />
    </ForcedTheme>
  );
}
