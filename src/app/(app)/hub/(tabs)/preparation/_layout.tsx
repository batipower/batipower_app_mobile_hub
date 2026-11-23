import { Stack } from 'expo-router';

import { fallbackBackHeaderLeft } from '@/components/navigation/StackBackButton';
import { useTheme } from '@/theme';

/**
 * La liste est toujours placée sous les écrans poussés (fiche commande, stock réseau, notification,
 * lien profond) : le retour natif existe alors même quand l'écran est ouvert de l'extérieur.
 */
export const unstable_settings = { anchor: 'index' };

/**
 * Pile de l'onglet Préparation : la liste (sans en-tête natif, elle a le sien) et le
 * détail d'une commande, poussé par-dessus avec le bouton retour natif.
 */
export default function PreparationLayout() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: t.bg },
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.accentText,
        headerTitleStyle: { color: t.text },
        headerShadowVisible: false,
        headerBackTitle: 'Retour',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Retour de repli si l'écran se retrouve seul dans la pile (voir StackBackButton). */}
      <Stack.Screen
        name="[reference]"
        options={{ title: 'Commande', headerLeft: fallbackBackHeaderLeft('/hub/preparation') }}
      />
      <Stack.Screen
        name="stock/[reference]"
        options={{ title: 'Stock réseau', headerLeft: fallbackBackHeaderLeft('/hub/preparation') }}
      />
      <Stack.Screen
        name="scan"
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
    </Stack>
  );
}
