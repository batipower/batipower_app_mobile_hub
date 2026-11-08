import { Stack } from 'expo-router';

import { StackBackButton } from '@/components/navigation/StackBackButton';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useAuth } from '@/auth/AuthProvider';
import { getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/**
 * Pile Retours, ouverte depuis le menu : l'historique, la fiche d'un retour, puis les filtres, la
 * réception et la remarque manager, présentés en feuilles natives (`formSheet`) par-dessus la page
 * qui les déclenche.
 */
export default function ReturnsLayout() {
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
          title: 'Retours',
          headerLeft: () => (user ? <StackBackButton fallbackHref={getLandingHref(user)} /> : null),
        }}
      />
      <Stack.Screen name="[reference]" options={{ title: 'Retour' }} />
      <Stack.Screen name="filtres" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="recevoir" options={sheetOptions(t, SHEET_DETENTS.tall)} />
      <Stack.Screen name="note" options={sheetOptions(t, SHEET_DETENTS.editor)} />
    </Stack>
  );
}
