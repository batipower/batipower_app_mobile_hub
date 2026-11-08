import { Stack } from 'expo-router';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { fallbackBackHeaderLeft } from '@/components/navigation/StackBackButton';
import { useTheme } from '@/theme';

/**
 * La recherche est toujours placée sous les fiches ouvertes depuis un autre onglet (Cockpit,
 * Discussions, Pricing) : le retour natif existe alors même quand la fiche est seule.
 */
export const unstable_settings = { anchor: 'index' };

const FALLBACK_HREF = '/hub/recherche';

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
      {/* Retour de repli si l'écran se retrouve seul dans la pile (voir StackBackButton). */}
      <Stack.Screen
        name="commandes"
        options={{ title: 'Commandes', headerLeft: fallbackBackHeaderLeft(FALLBACK_HREF) }}
      />
      <Stack.Screen
        name="commande/[reference]"
        options={{ title: 'Commande', headerLeft: fallbackBackHeaderLeft(FALLBACK_HREF) }}
      />
      <Stack.Screen
        name="produit/[reference]"
        options={{ title: 'Produit', headerLeft: fallbackBackHeaderLeft(FALLBACK_HREF) }}
      />
    </Stack>
  );
}
