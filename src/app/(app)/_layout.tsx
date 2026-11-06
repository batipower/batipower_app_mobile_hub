import { useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { accessibleModules } from '@/modules/registry';
import { moduleSheetDetent } from '@/modules/switchModule';
import { useTheme } from '@/theme';

/**
 * Zone réservée aux sessions ouvertes. L'accès est déjà verrouillé par
 * `Stack.Protected` à la racine ; ce garde en est la ceinture de sécurité : sans
 * utilisateur, rien n'est rendu (pas de fuite d'écran pendant une déconnexion).
 *
 * Un module = un écran de la pile (`hub`, `modules/[id]`…). Le sélecteur de module
 * (`switch-module`) se présente par-dessus, en feuille native.
 */
export default function AppLayout() {
  const t = useTheme();
  const { user } = useAuth();
  const { height } = useWindowDimensions();
  if (!user) return null;

  const detent = moduleSheetDetent(accessibleModules(user).length, height);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.bg },
      }}
    >
      <Stack.Screen
        name="switch-module"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [detent],
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
          contentStyle: { backgroundColor: t.bgElevated },
        }}
      />
    </Stack>
  );
}
