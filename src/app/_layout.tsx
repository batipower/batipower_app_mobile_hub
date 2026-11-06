import { useEffect } from 'react';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { queryClient } from '@/api/queryClient';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme';

// Le splash natif reste affiché tant que la session n'a pas été vérifiée.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 250, fade: true });

// Thème sombre aux couleurs Batipower : évite les flashs blancs entre écrans et
// sous la barre d'onglets native.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.green,
    background: colors.black,
    card: colors.black,
    border: 'transparent',
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.black }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider value={navigationTheme}>
              <SplashController />
              <RootNavigator />
            </ThemeProvider>
            <Toaster theme="dark" position="top-center" richColors />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function SplashController() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hide();
  }, [status]);

  return null;
}

/**
 * Routes protégées selon l'état de session (`Stack.Protected`) : quand le garde d'un
 * groupe passe à `false`, son historique de navigation est purgé. `index` (toujours
 * accessible) sert d'ancre et redirige vers le bon écran.
 */
function RootNavigator() {
  const { status } = useAuth();

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.black },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'unreachable'}>
          <Stack.Screen name="unreachable" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
