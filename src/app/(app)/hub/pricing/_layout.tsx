import type { ComponentProps } from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

type SheetOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Pile Pricing, ouverte depuis le menu : la liste, la fiche d'une ligne, puis les filtres,
 * tris, statistiques et éditions, présentés en feuilles natives (`formSheet`) par-dessus la
 * page qui les déclenche.
 */
export default function PricingLayout() {
  const t = useTheme();

  const sheet = (detents: number[]): SheetOptions => ({
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: 16,
    contentStyle: { backgroundColor: t.bgElevated },
    headerShown: false,
  });

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
      <Stack.Screen name="index" options={{ title: 'Pricing' }} />
      <Stack.Screen name="[reference]" options={{ title: 'Ligne pricing' }} />
      <Stack.Screen name="filtres" options={sheet([0.9, 1])} />
      <Stack.Screen name="choix/[kind]" options={sheet([0.9, 1])} />
      <Stack.Screen name="tri" options={sheet([0.7, 1])} />
      <Stack.Screen name="stats" options={sheet([0.9, 1])} />
      <Stack.Screen name="editer" options={sheet([0.5, 0.9])} />
    </Stack>
  );
}
