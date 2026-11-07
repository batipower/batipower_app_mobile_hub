import type { ComponentProps } from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

type SheetOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Pile de l'onglet Discussions : la liste (sans en-tête natif, elle a le sien comme Cockpit et
 * Préparation : titre, recherche et filtres dès le haut de l'écran), les fils Équipe et
 * Clients, l'écran des membres et celui des invitations, avec le bouton retour natif. La
 * création d'une discussion et les actions SAV s'ouvrent en feuilles natives (`formSheet`).
 */
export default function DiscussionsLayout() {
  const t = useTheme();

  const sheet = (detents: number[]): SheetOptions => ({
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: 16,
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="equipe/[id]" options={{ title: 'Discussion' }} />
      <Stack.Screen name="equipe/[id]/membres" options={{ title: 'Membres' }} />
      <Stack.Screen name="equipe/nouvelle" options={sheet([0.9, 1])} />
      <Stack.Screen name="invitations" options={{ title: 'Invitations' }} />
      <Stack.Screen name="clients/[id]" options={{ title: 'Client' }} />
      <Stack.Screen name="clients/[id]/action" options={sheet([0.9, 1])} />
    </Stack>
  );
}
