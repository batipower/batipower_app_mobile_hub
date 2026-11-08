import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { accessibleModules, getLandingHref } from '@/modules/registry';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/**
 * Pile du module HUB, réservé aux comptes qui le possèdent (le back le refuse de toute façon
 * sur `/hub-app/*`).
 *
 * - `(tabs)` : onglets avec la barre flottante Batipower (Cockpit, Préparation, Discussions,
 *   Recherche, et le bouton éclair central qui ouvre le menu).
 * - `menu` : feuille native à mi-écran ouverte par le bouton central (lignes de navigation).
 * - `scraping-fleet` : feuille à mi-écran ouverte par la pastille des scrapers du cockpit.
 * - `pricing`, `product-analyzer`, `profil` : pages secondaires lancées depuis le menu, poussées par-dessus les
 *   onglets avec le bouton retour natif. Le profil est une page à part, pas un bloc du menu.
 */
export default function HubLayout() {
  const t = useTheme();
  const { user } = useAuth();
  if (!user) return null;
  if (!accessibleModules(user).includes('HUB')) return <Redirect href={getLandingHref(user)} />;

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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="menu"
        options={sheetOptions(t, SHEET_DETENTS.half, { sheetInitialDetentIndex: 0 })}
      />
      <Stack.Screen
        name="scraping-fleet"
        options={sheetOptions(t, SHEET_DETENTS.half, { sheetInitialDetentIndex: 0 })}
      />
      <Stack.Screen name="pricing" options={{ headerShown: false }} />
      <Stack.Screen name="product-analyzer" options={{ headerShown: false }} />
      <Stack.Screen name="profil" options={{ title: 'Profil' }} />
    </Stack>
  );
}
