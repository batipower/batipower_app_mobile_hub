import { Stack } from 'expo-router';

import { StackBackButton } from '@/components/navigation/StackBackButton';
import { useAuth } from '@/auth/AuthProvider';
import { getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/**
 * Pile Candidats palette, ouverte depuis le menu ou depuis le push « Commande à arbitrer » : la
 * liste des commandes à arbitrer, puis la page d'arbitrage d'une commande.
 */
export default function PalletCandidatesLayout() {
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
          title: 'Candidats palette',
          headerLeft: () => (user ? <StackBackButton fallbackHref={getLandingHref(user)} /> : null),
        }}
      />
      <Stack.Screen name="[reference]" options={{ title: 'Commande palette' }} />
    </Stack>
  );
}
