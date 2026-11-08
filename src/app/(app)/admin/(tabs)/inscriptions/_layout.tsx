import { Stack } from 'expo-router';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/** La liste est toujours sous les feuilles qu'elle ouvre. */
export const unstable_settings = { anchor: 'index' };

/** Pile de l'onglet Inscriptions : la liste, puis les feuilles Approuver et Refuser. */
export default function RegistrationsLayout() {
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
          title: 'Inscriptions',
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: t.bg },
          headerLargeTitleStyle: { color: t.text },
          headerRight: () => <ModuleSwitcherButton active="ADMIN" />,
        }}
      />
      <Stack.Screen name="approuver" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="refuser" options={sheetOptions(t, SHEET_DETENTS.editor)} />
    </Stack>
  );
}
