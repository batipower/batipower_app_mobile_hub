import { Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme';

/**
 * Zone réservée aux sessions ouvertes. L'accès est déjà verrouillé par
 * `Stack.Protected` à la racine ; ce garde en est la ceinture de sécurité : sans
 * utilisateur, rien n'est rendu (pas de fuite d'écran pendant une déconnexion).
 */
export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.black },
      }}
    />
  );
}
