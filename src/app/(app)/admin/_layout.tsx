import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessAdmin } from '@/auth/permissions';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { StackBackButton } from '@/components/navigation/StackBackButton';
import { accessibleModules, getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/**
 * Pile du module ADMIN, réservé au SUPERADMIN (le back refuse de toute façon `buyer-app/admin/*`
 * aux autres rôles). Pendant une impersonation, le rôle effectif est celui du compte usurpé : le
 * module disparaît de lui-même.
 *
 * - `(tabs)` : onglets avec la barre flottante Batipower (Utilisateurs, Inscriptions, Partenaires,
 *   Plateforme, et le bouton éclair central qui ouvre le menu).
 * - `menu` : feuille native à mi-écran ouverte par le bouton central.
 * - `activite` : page secondaire lancée depuis le menu.
 */
export default function AdminLayout() {
  const t = useTheme();
  const { user } = useAuth();
  if (!user) return null;
  if (!accessibleModules(user).includes('ADMIN') || !canAccessAdmin(user.role)) {
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
      <Stack.Screen
        name="activite"
        options={{
          title: 'Activité',
          headerLeft: () => <StackBackButton fallbackHref="/admin/utilisateurs" />,
        }}
      />
    </Stack>
  );
}
