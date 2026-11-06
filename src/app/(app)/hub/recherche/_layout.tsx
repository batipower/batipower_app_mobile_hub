import { Stack } from 'expo-router';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { useTheme } from '@/theme';

/**
 * Pile de l'onglet Recherche : l'écran de recherche (grand titre et barre de recherche
 * natifs), la liste complète des commandes, puis les fiches commande et produit
 * poussées par-dessus avec le bouton retour natif.
 */
export default function SearchLayout() {
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
      <Stack.Screen
        name="index"
        options={{
          title: 'Recherche',
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: t.bg },
          headerLargeTitleStyle: { color: t.text },
          headerRight: () => <ModuleSwitcherButton active="HUB" />,
        }}
      />
      <Stack.Screen name="commandes" options={{ title: 'Commandes' }} />
      <Stack.Screen name="commande/[reference]" options={{ title: 'Commande' }} />
      <Stack.Screen name="produit/[reference]" options={{ title: 'Produit' }} />
    </Stack>
  );
}
