import { NativeTabs } from 'expo-router/native-tabs';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCockpit, canAccessHubPreparation } from '@/auth/permissions';
import { useDiscussionsUnread } from '@/features/discussions/hooks/useDiscussionsUnread';
import { badgeCount } from '@/features/discussions/shared/format';
import { openHubMenu } from '@/features/menu/navigation';
import { useTheme, withAlpha } from '@/theme';

/**
 * Barre d'onglets native du module HUB (Liquid Glass sur iOS 26+).
 *
 * Les onglets Cockpit (SUPERADMIN) et Préparation n'apparaissent que pour les rôles
 * autorisés. Discussions (messagerie Équipe et Clients) est ouvert à tout compte HUB, avec un
 * badge de non-lus. La Recherche est ouverte à tout compte HUB : sur iOS 26, elle s'affiche en
 * bouton séparé. Le dernier onglet, Menu, n'est jamais sélectionné : il est `disabled` (iOS et
 * Android bloquent la sélection mais émettent `tabPress`), et son appui ouvre la feuille de
 * menu à mi-écran déclarée dans `hub/_layout.tsx`.
 */
export default function HubTabsLayout() {
  const t = useTheme();
  const { user } = useAuth();
  const unread = useDiscussionsUnread(!!user);
  if (!user) return null;

  return (
    <NativeTabs
      tintColor={t.accentText}
      backgroundColor={t.bgElevated}
      indicatorColor={withAlpha(t.accent, 0.2)}
    >
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
      <NativeTabs.Trigger name="discussions">
        <NativeTabs.Trigger.Label>Discussions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" md="forum" />
        <NativeTabs.Trigger.Badge hidden={unread.total === 0}>
          {badgeCount(unread.total)}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="recherche" role="search">
        <NativeTabs.Trigger.Label>Recherche</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plus" disabled listeners={{ tabPress: openHubMenu }}>
        <NativeTabs.Trigger.Label>Menu</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="line.3.horizontal" md="menu" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
