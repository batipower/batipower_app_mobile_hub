import { Stack } from 'expo-router';

import { StudioBackButton } from '@/features/product-studio/components/StudioBackButton';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/**
 * Pile « Fiches produit », ouverte depuis le menu : la file « À traiter », le Studio d'une fiche
 * (relecture, déploiement), puis les filtres et sélecteurs présentés en feuilles natives.
 */
export default function StudioLayout() {
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
      {/* Première page de la pile : pas de retour natif, on le fournit. */}
      <Stack.Screen
        name="index"
        options={{ title: 'Fiches produit', headerLeft: () => <StudioBackButton /> }}
      />
      <Stack.Screen name="studio/[reference]" options={{ title: 'Studio', gestureEnabled: false }} />
      <Stack.Screen name="filtres" options={sheetOptions(t, SHEET_DETENTS.tall)} />
    </Stack>
  );
}
