import { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/theme';

/**
 * Gestion du clavier d'une feuille native : le bas de la feuille coïncide avec le bas de
 * l'écran, donc la hauteur du clavier se retranche directement du contenu.
 *
 * - `rootStyle` : réserve la place du clavier, le corps rétrécit et le pied reste au-dessus.
 * - `footerStyle` : le pied garde la zone sûre du bas, qu'il abandonne quand le clavier la couvre.
 */
export function useSheetKeyboard() {
  const keyboard = useAnimatedKeyboard();
  const insets = useSafeAreaInsets();
  const restingPadding = Math.max(insets.bottom, spacing.lg);

  const rootStyle = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value }));
  const footerStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value > 0 ? spacing.md : restingPadding,
  }));

  return { rootStyle, footerStyle, restingPadding };
}
