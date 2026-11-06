import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthBackground } from '@/components/auth/AuthBackground';
import { colors, ForcedTheme } from '@/theme';

/**
 * Le fond animé est posé une seule fois derrière le navigateur : les écrans
 * (login, 2FA) sont transparents, il ne se recharge donc pas à chaque transition.
 *
 * La connexion garde toujours l'identité sombre de la marque (comme la page de connexion
 * du web), quelle que soit l'apparence choisie dans le profil : les composants partagés
 * (champs, boutons, cartes) y reçoivent donc le thème sombre.
 */
export default function AuthLayout() {
  return (
    <ForcedTheme scheme="dark">
      <View style={{ flex: 1, backgroundColor: colors.black }}>
        <StatusBar style="light" />
        <AuthBackground />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </View>
    </ForcedTheme>
  );
}
