import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCockpit, canAccessHubPreparation } from '@/auth/permissions';
import { accessibleModules, getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/**
 * Navigation du module HUB : barre d'onglets native iOS (Liquid Glass sur iOS 26+).
 *
 * Le module est réservé aux comptes qui le possèdent (le back le refuse de toute façon
 * sur `/hub-app/*`) ; les onglets Cockpit (SUPERADMIN) et Préparation n'apparaissent que
 * pour les rôles autorisés. La Recherche est ouverte à tout compte HUB : sur iOS 26, elle
 * s'affiche en bouton séparé.
 */
export default function HubLayout() {
  const t = useTheme();
  const { user } = useAuth();
  if (!user) return null;
  if (!accessibleModules(user).includes('HUB')) return <Redirect href={getLandingHref(user)} />;

  return (
    <NativeTabs tintColor={t.accentText}>
      <NativeTabs.Trigger name="cockpit" hidden={!canAccessHubCockpit(user.role)}>
        <NativeTabs.Trigger.Label>Cockpit</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gauge" md="speed" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="preparation" hidden={!canAccessHubPreparation(user.role)}>
        <NativeTabs.Trigger.Label>Préparation</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }}
          md="inventory_2"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="recherche" role="search">
        <NativeTabs.Trigger.Label>Recherche</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
