import { Stack } from 'expo-router';

import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/**
 * Pile de l'onglet Produits : la liste (sans en-tête natif, elle a le sien), la fiche d'un produit
 * et son fil de messages, puis les feuilles de filtres (`formSheet`). La feuille de marque est
 * ouverte depuis celle des filtres et reprend son détent.
 */
export default function PartnerProductsLayout() {
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
      <Stack.Screen name="produit/[reference]" options={{ title: 'Produit' }} />
      <Stack.Screen name="conversation/[reference]" options={{ title: 'Messages' }} />
      <Stack.Screen name="filtres" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="marque" options={sheetOptions(t, SHEET_DETENTS.tall)} />
    </Stack>
  );
}
