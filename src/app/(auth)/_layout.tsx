import { View } from 'react-native';
import { Stack } from 'expo-router';

import { AuthBackground } from '@/components/auth/AuthBackground';
import { colors } from '@/theme';

/**
 * Le fond animé est posé une seule fois derrière le navigateur : les écrans
 * (login, 2FA) sont transparents, il ne se recharge donc pas à chaque transition.
 */
export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
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
