import { Stack } from 'expo-router';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

export const unstable_settings = { anchor: 'index' };

/** Pile de l'onglet Plateforme : accueil, écrans de réglage et feuilles de formulaire. */
export default function PlatformLayout() {
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
          title: 'Plateforme',
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: t.bg },
          headerLargeTitleStyle: { color: t.text },
          headerRight: () => <ModuleSwitcherButton active="ADMIN" />,
        }}
      />
      <Stack.Screen name="maintenance" options={{ title: 'Maintenance' }} />
      <Stack.Screen name="horaires" options={{ title: 'Horaires du support' }} />
      <Stack.Screen name="rib" options={{ title: 'RIB des devis' }} />
      <Stack.Screen name="cles-api" options={{ title: 'Clés API' }} />
      <Stack.Screen name="rib-formulaire" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="cles-api-formulaire" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="cles-api-approuver" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="cles-api-refuser" options={sheetOptions(t, SHEET_DETENTS.editor)} />
    </Stack>
  );
}
