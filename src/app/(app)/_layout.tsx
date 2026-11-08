import { View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { ImpersonationBanner } from '@/components/auth/ImpersonationBanner';
import { accessibleModules } from '@/modules/registry';
import { moduleSheetDetent } from '@/modules/switchModule';
import { sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/**
 * Zone réservée aux sessions ouvertes. L'accès est déjà verrouillé par
 * `Stack.Protected` à la racine ; ce garde en est la ceinture de sécurité : sans
 * utilisateur, rien n'est rendu (pas de fuite d'écran pendant une déconnexion).
 *
 * Un module = un écran de la pile (`hub`, `modules/[id]`…). Le sélecteur de module
 * (`switch-module`) et le choix du compte à usurper (`impersonate`) se présentent par-dessus,
 * en feuilles natives. Pendant une impersonation, une pastille flottante reste affichée au-dessus
 * de la pile pour en sortir depuis n'importe quel écran.
 */
export default function AppLayout() {
  const t = useTheme();
  const { user } = useAuth();
  const { height } = useWindowDimensions();
  if (!user) return null;

  const detent = moduleSheetDetent(accessibleModules(user).length, height);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen
          name="switch-module"
          options={sheetOptions(t, [detent])}
        />
        <Stack.Screen
          name="impersonate"
          options={sheetOptions(t, [0.85, 1])}
        />
      </Stack>
      <ImpersonationBanner />
    </View>
  );
}
