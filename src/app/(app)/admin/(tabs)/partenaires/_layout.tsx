import { Stack } from 'expo-router';

import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

export const unstable_settings = { anchor: 'index' };

/** Pile de l'onglet Distributeurs : liste, fiches distributeur / entrepôt et feuilles de formulaire. */
export default function PartnersLayout() {
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
          title: 'Distributeurs',
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: t.bg },
          headerLargeTitleStyle: { color: t.text },
        }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Distributeur' }} />
      <Stack.Screen name="entrepot" options={{ title: 'Entrepôt' }} />
      <Stack.Screen name="comptes-ebatpro" options={{ title: 'Comptes eBatPro' }} />
      <Stack.Screen name="distributeur-formulaire" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="entrepot-formulaire" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="filiale-formulaire" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="ebatpro-formulaire" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="logo" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="marge" options={sheetOptions(t, SHEET_DETENTS.editor)} />
    </Stack>
  );
}
