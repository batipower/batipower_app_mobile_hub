import { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { queryClient } from '@/api/queryClient';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { PushNotificationsController } from '@/notifications/PushNotificationsController';
import { AppThemeProvider, useTheme } from '@/theme';

// Le splash natif reste affiché tant que la session n'a pas été vérifiée.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootProviders />
    </AppThemeProvider>
  );
}

function RootProviders() {
  const t = useTheme();

  // Thème de navigation aux couleurs Batipower (sombre ou clair) : évite les flashs
  // entre écrans et sous la barre d'onglets native.
  const navigationTheme = useMemo(() => {
    const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.accentText,
        background: t.bg,
        card: t.bg,
        text: t.text,
        border: 'transparent',
      },
    };
  }, [t]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider value={navigationTheme}>
              <SplashController />
              <PushNotificationsController />
              <RootNavigator />
            </ThemeProvider>
            <Toaster theme={t.scheme} position="top-center" richColors />
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
  const t = useTheme();

  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: t.bg },
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
