import { Stack } from 'expo-router';

import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/**
 * Pile de l'onglet Inter-agences : la liste (sans en-tête natif, elle a le sien), la fiche d'une
 * commande et ses fils, puis les feuilles : filtres, « Réalisée » (agences prévenues) et
 * « Impossible d'honorer » (motif).
 */
export default function PartnerInterAgencyLayout() {
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
      <Stack.Screen name="commande/[reference]" options={{ title: 'Commande' }} />
      <Stack.Screen name="conversation/[reference]" options={{ title: 'Messages' }} />
      <Stack.Screen name="filtres" options={sheetOptions(t, SHEET_DETENTS.half)} />
      <Stack.Screen name="realisee" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="impossible" options={sheetOptions(t, SHEET_DETENTS.tall)} />
    </Stack>
  );
}
