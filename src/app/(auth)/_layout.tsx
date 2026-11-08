import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthBackground } from '@/components/auth/AuthBackground';
import { colors, useTheme } from '@/theme';

/**
 * Le fond animé est posé une seule fois derrière le navigateur : les écrans
 * (login, 2FA) sont transparents, il ne se recharge donc pas à chaque transition.
 *
 * La connexion suit l'apparence de l'app (sombre, clair ou auto) : les composants partagés
 * (champs, boutons, cartes) et le fond animé reprennent les couleurs du thème courant.
 */
export default function AuthLayout() {
  const t = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: t.scheme === 'dark' ? colors.black : t.bg }}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <AuthBackground />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </View>
  );
}
