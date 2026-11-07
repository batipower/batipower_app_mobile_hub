import type { ComponentProps } from 'react';
import { Stack } from 'expo-router';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { useTheme } from '@/theme';

type SheetOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Pile de l'onglet Menu : le lanceur (index), le profil, puis les pages secondaires du HUB
 * (Pricing…). Les filtres, tris, statistiques et éditions s'ouvrent en feuilles natives
 * (`formSheet`) par-dessus la page qui les déclenche.
 */
export default function MenuLayout() {
  const t = useTheme();

  const sheet = (detents: number[]): SheetOptions => ({
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
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
      <Stack.Screen
        name="index"
        options={{
          title: 'Menu',
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: t.bg },
          headerLargeTitleStyle: { color: t.text },
          headerRight: () => <ModuleSwitcherButton active="HUB" />,
        }}
      />
      <Stack.Screen name="profil" options={{ title: 'Profil' }} />
      <Stack.Screen name="pricing/index" options={{ title: 'Pricing' }} />
      <Stack.Screen name="pricing/[reference]" options={{ title: 'Ligne pricing' }} />
      <Stack.Screen name="pricing/filtres" options={sheet([0.9, 1])} />
      <Stack.Screen name="pricing/choix/[kind]" options={sheet([0.9, 1])} />
      <Stack.Screen name="pricing/tri" options={sheet([0.7, 1])} />
      <Stack.Screen name="pricing/stats" options={sheet([0.9, 1])} />
      <Stack.Screen name="pricing/editer" options={sheet([0.5, 0.9])} />
    </Stack>
  );
}
