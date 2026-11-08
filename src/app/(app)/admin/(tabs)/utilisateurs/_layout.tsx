import { Stack } from 'expo-router';

import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

export const unstable_settings = { anchor: 'index' };

/** Pile de l'onglet Utilisateurs : liste, fiche, formulaire plein écran et feuille de filtres. */
export default function UsersLayout() {
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
          title: 'Utilisateurs',
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: t.bg },
          headerLargeTitleStyle: { color: t.text },
        }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Utilisateur' }} />
      <Stack.Screen name="edition" options={{ title: 'Utilisateur' }} />
      <Stack.Screen name="filtres" options={sheetOptions(t, SHEET_DETENTS.editor)} />
    </Stack>
  );
}
