import { Stack } from 'expo-router';

import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/** Pile d'une demande de devis : sa fiche, puis le refus (e-mail rédigé avec l'IA) en feuille. */
export default function QuoteRequestLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Demande de devis' }} />
      <Stack.Screen name="refus" options={sheetOptions(t, SHEET_DETENTS.tall)} />
    </Stack>
  );
}
