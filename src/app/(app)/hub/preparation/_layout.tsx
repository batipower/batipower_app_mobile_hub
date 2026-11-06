import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Pile de l'onglet Préparation : la liste (sans en-tête natif, elle a le sien) et le
 * détail d'une commande, poussé par-dessus avec le bouton retour natif.
 */
export default function PreparationLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.black },
        headerStyle: { backgroundColor: colors.black },
        headerTintColor: colors.green,
        headerTitleStyle: { color: colors.white },
        headerShadowVisible: false,
        headerBackTitle: 'Retour',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[reference]" options={{ title: 'Commande' }} />
    </Stack>
  );
}
