import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Pile de l'onglet Cockpit : le tableau de bord (sans en-tête natif, il a le sien) et ses vues
 * sœurs Site, Stats PARTNER et Financier, puis la liste des commandes d'un jour et la fiche
 * d'une commande, poussées par-dessus avec le bouton retour natif.
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
      {/* Autres vues de l'accueil HUB, ouvertes par le titre déroulant (`replace`, fondu). */}
      <Stack.Screen name="site" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="partner" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="financier" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="jour/[date]" options={{ title: 'Commandes du jour' }} />
      <Stack.Screen name="commande/[reference]" options={{ title: 'Commande' }} />
    </Stack>
  );
}
