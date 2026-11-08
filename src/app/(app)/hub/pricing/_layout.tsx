import { Stack } from 'expo-router';

import { PricingBackButton } from '@/features/pricing/components/PricingBackButton';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/**
 * Pile Pricing, ouverte depuis le menu : la liste, la fiche d'une ligne, puis les filtres,
 * tris, statistiques et éditions, présentés en feuilles natives (`formSheet`) par-dessus la
 * page qui les déclenche.
 */
export default function PricingLayout() {
  const t = useTheme();

  const sheet = (detents: readonly number[]) => sheetOptions(t, detents);

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
      {/* Première page de la pile : pas de retour natif, on le fournit (voir PricingBackButton). */}
      <Stack.Screen
        name="index"
        options={{ title: 'Pricing', headerLeft: () => <PricingBackButton /> }}
      />
      <Stack.Screen name="[reference]" options={{ title: 'Ligne pricing' }} />
      <Stack.Screen name="filtres" options={sheet(SHEET_DETENTS.tall)} />
      <Stack.Screen name="choix/[kind]" options={sheet(SHEET_DETENTS.tall)} />
      <Stack.Screen name="tri" options={sheet(SHEET_DETENTS.sort)} />
      <Stack.Screen name="stats" options={sheet(SHEET_DETENTS.tall)} />
      <Stack.Screen name="editer" options={sheet(SHEET_DETENTS.editor)} />
    </Stack>
  );
}
