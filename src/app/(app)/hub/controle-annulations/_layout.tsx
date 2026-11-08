import { Stack } from 'expo-router';

import { StackBackButton } from '@/components/navigation/StackBackButton';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useAuth } from '@/auth/AuthProvider';
import { getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/**
 * Pile Contrôle annulations, ouverte depuis le menu : la liste des alertes, la fiche d'une
 * commande, puis la saisie du commentaire pour ignorer une alerte, présentée en feuille native
 * (`formSheet`) par-dessus la liste.
 */
export default function CancellationControlLayout() {
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
          title: 'Contrôle annulations',
          headerLeft: () => (user ? <StackBackButton fallbackHref={getLandingHref(user)} /> : null),
        }}
      />
      <Stack.Screen name="commande/[reference]" options={{ title: 'Commande' }} />
      <Stack.Screen name="ignorer" options={sheetOptions(t, SHEET_DETENTS.editor)} />
    </Stack>
  );
}
