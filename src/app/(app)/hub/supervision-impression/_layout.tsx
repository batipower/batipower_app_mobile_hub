import { Stack } from 'expo-router';

import { StackBackButton } from '@/components/navigation/StackBackButton';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useAuth } from '@/auth/AuthProvider';
import { getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/**
 * Pile Supervision impression, ouverte depuis le menu ou la pastille imprimantes du cockpit : la
 * page de supervision, puis la saisie de l'adresse d'un poste en feuille native (`formSheet`).
 */
export default function PrintSupervisionLayout() {
  const t = useTheme();
  const { user } = useAuth();

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
      {/* Première page de la pile : pas de retour natif, on le fournit. */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Supervision impression',
          headerLeft: () => (user ? <StackBackButton fallbackHref={getLandingHref(user)} /> : null),
        }}
      />
      <Stack.Screen name="adresse" options={sheetOptions(t, SHEET_DETENTS.tall)} />
    </Stack>
  );
}
