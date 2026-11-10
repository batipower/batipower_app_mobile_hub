import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { partnerTabsFor } from '@/auth/permissions';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { accessibleModules, getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/**
 * Pile du module PARTNER, réservée aux comptes qui le possèdent et ont au moins un onglet mobile
 * (le back refuse de toute façon `buyer-app/*` aux autres modules).
 *
 * - `(tabs)` : onglets avec la barre flottante Batipower (Produits, Opportunités, Inter-agences,
 *   BL à corriger, et le bouton éclair central qui ouvre le menu).
 * - `menu` : feuille native à mi-écran ouverte par le bouton central.
 * - `flux`, `profil` : pages secondaires lancées depuis le menu (le dashboard flux est réservé
 *   au SUPERADMIN et au RAF).
 */
export default function PartnerLayout() {
  const t = useTheme();
  const { user } = useAuth();
  if (!user) return null;
  if (!accessibleModules(user).includes('PARTNER') || partnerTabsFor(user).length === 0) {
    return <Redirect href={getLandingHref(user)} />;
  }

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
      <Stack.Screen name="flux" options={{ title: 'Dashboard flux' }} />
      <Stack.Screen name="profil" options={{ title: 'Profil' }} />
    </Stack>
  );
}
