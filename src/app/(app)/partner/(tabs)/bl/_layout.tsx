import { Stack } from 'expo-router';

import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/**
 * Pile de l'onglet BL à corriger : la liste des lignes en écart (sans en-tête natif, elle a le
 * sien), la fiche d'un BL et son fil, puis les feuilles de filtre (marque).
 */
export default function PartnerDeliveryNotesLayout() {
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
      <Stack.Screen name="bon/[uuid]" options={{ title: 'BL' }} />
      <Stack.Screen name="conversation/[uuid]" options={{ title: 'Messages' }} />
      <Stack.Screen name="filtres" options={sheetOptions(t, SHEET_DETENTS.half)} />
      <Stack.Screen name="marque" options={sheetOptions(t, SHEET_DETENTS.half)} />
    </Stack>
  );
}
