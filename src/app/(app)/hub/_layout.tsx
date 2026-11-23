import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { accessibleModules, getLandingHref } from '@/modules/registry';
import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { useTheme } from '@/theme';

/**
 * Les onglets sont toujours placés sous les pages poussées (notification, lien profond, démarrage
 * à froid) : un retour mène alors à l'accueil du module au lieu de laisser l'utilisateur bloqué
 * (la barre d'onglets est masquée sur les écrans poussés).
 */
export const unstable_settings = { anchor: '(tabs)' };

/**
 * Pile du module HUB, réservé aux comptes qui le possèdent (le back le refuse de toute façon
 * sur `/hub-app/*`).
 *
 * - `(tabs)` : onglets avec la barre flottante Batipower (Cockpit, Préparation, Discussions,
 *   Recherche, et le bouton éclair central qui ouvre le menu).
 * - `menu` : feuille native à mi-écran ouverte par le bouton central (lignes de navigation).
 * - `scraping-fleet` : feuille à mi-écran ouverte par la pastille des scrapers du cockpit.
 * - `retours`, `controle-annulations`, `collecte-entrepot`, `candidats-palette`, `pricing`, `fiches-produit`, `marges-marques`, `product-analyzer`, `supervision-impression`, `profil` : pages secondaires lancées depuis le menu,
 *   poussées par-dessus les onglets avec le bouton retour natif. Le profil est une page à part, pas
 *   un bloc du menu.
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
      <Stack.Screen name="retours" options={{ headerShown: false }} />
      <Stack.Screen name="controle-annulations" options={{ headerShown: false }} />
      <Stack.Screen name="collecte-entrepot" options={{ headerShown: false }} />
      <Stack.Screen name="candidats-palette" options={{ headerShown: false }} />
      <Stack.Screen name="pricing" options={{ headerShown: false }} />
      <Stack.Screen name="fiches-produit" options={{ headerShown: false }} />
      <Stack.Screen name="marges-marques" options={{ headerShown: false }} />
      <Stack.Screen name="product-analyzer" options={{ headerShown: false }} />
      <Stack.Screen name="supervision-impression" options={{ headerShown: false }} />
      <Stack.Screen name="deploiement/[reference]" options={{ title: 'Déploiement' }} />
      <Stack.Screen name="profil" options={{ title: 'Profil' }} />
    </Stack>
  );
}
