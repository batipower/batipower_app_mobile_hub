import { Stack } from 'expo-router';

import { StackBackButton } from '@/components/navigation/StackBackButton';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useAuth } from '@/auth/AuthProvider';
import { getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/**
 * Pile Marges marques, ouverte depuis le menu : la liste des marques, la fiche d'une marque et la
 * fiche d'une commande, puis la feuille de filtres présentée en feuille native (`formSheet`).
 */
export default function BrandMarginLayout() {
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
          title: 'Marges marques',
          headerLeft: () => (user ? <StackBackButton fallbackHref={getLandingHref(user)} /> : null),
        }}
      />
      <Stack.Screen name="[brand]" options={{ title: 'Marque' }} />
      <Stack.Screen name="commande/[reference]" options={{ title: 'Commande' }} />
      <Stack.Screen name="filtres" options={sheetOptions(t, SHEET_DETENTS.tall)} />
    </Stack>
  );
}
