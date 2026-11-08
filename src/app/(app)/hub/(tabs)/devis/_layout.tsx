import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Pile de l'onglet Devis : le pipeline (sans en-tête natif, il a le sien comme Discussions),
 * le détail d'une demande et l'éditeur d'un devis, chacun poussé par-dessus avec sa propre pile
 * (feuilles natives comprises, voir leurs `_layout.tsx`).
 */
export default function QuotesLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="demande/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
