import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Pile de l'onglet Cockpit : le tableau de bord (sans en-tête natif, il a le sien), la liste
 * des commandes d'un jour, puis la fiche d'une commande, poussées par-dessus avec le bouton
 * retour natif.
 */
export default function CockpitLayout() {
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
      <Stack.Screen name="jour/[date]" options={{ title: 'Commandes du jour' }} />
      <Stack.Screen name="commande/[reference]" options={{ title: 'Commande' }} />
    </Stack>
  );
}
