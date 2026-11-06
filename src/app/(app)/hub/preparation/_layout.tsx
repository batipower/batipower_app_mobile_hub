import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

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
      <Stack.Screen name="[reference]" options={{ title: 'Commande' }} />
    </Stack>
  );
}
