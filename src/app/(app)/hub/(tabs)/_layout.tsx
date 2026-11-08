import { FileText, Gauge, MessagesSquare, Package, Search } from 'lucide-react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { useAuth } from '@/auth/AuthProvider';
import {
  canAccessHubCockpit,
  canAccessHubCustomerQuotes,
  canAccessHubPreparation,
} from '@/auth/permissions';
import { BatipowerTabBar, type TabBarItem } from '@/components/navigation/BatipowerTabBar';
import { useDiscussionsUnread } from '@/features/discussions/hooks/useDiscussionsUnread';
import { badgeCount } from '@/features/discussions/shared/format';
import { openHubMenu } from '@/features/menu/navigation';
import { usePendingQuoteRequests } from '@/features/quotes/hooks/usePendingQuoteRequests';
import { useTheme } from '@/theme';

/**
 * Onglets du module HUB, avec la barre flottante Batipower (`BatipowerTabBar`) à la place de la
 * barre native : onglets « headless » d'`expo-router/ui`, la `TabList` ne servant qu'à déclarer
 * les routes (masquée), tandis que la barre dessine les boutons.
 *
 * Les onglets Cockpit (SUPERADMIN) et Préparation n'apparaissent que pour les rôles autorisés ;
 * un onglet sans déclencheur est retiré de la navigation. Discussions (messagerie Équipe et
 * Clients) est ouvert à tout compte HUB, avec un badge de non-lus. Pour le SUPERADMIN, l'onglet
 * Devis (badge : demandes en attente) remplace Recherche, qui passe dans le menu ; son
 * déclencheur reste déclaré pour que la route soit atteignable. Le bouton
 * central (éclair) n'est pas un onglet : il ouvre la feuille de menu à mi-écran déclarée dans
 * `hub/_layout.tsx`.
 */
export default function HubTabsLayout() {
  const t = useTheme();
  const { user } = useAuth();
  const unread = useDiscussionsUnread(!!user);
  const showQuotes = !!user && canAccessHubCustomerQuotes(user.role);
  const pendingRequests = usePendingQuoteRequests(showQuotes);
  if (!user) return null;

  const showCockpit = canAccessHubCockpit(user.role);
  const showPreparation = canAccessHubPreparation(user.role);

  const items: TabBarItem[] = [
    ...(showCockpit ? [{ name: 'cockpit', label: 'Cockpit', Icon: Gauge }] : []),
    ...(showPreparation ? [{ name: 'preparation', label: 'Préparation', Icon: Package }] : []),
    ...(showQuotes
      ? [
          {
            name: 'devis',
            label: 'Devis',
            Icon: FileText,
            badge: pendingRequests > 0 ? badgeCount(pendingRequests) : null,
          },
        ]
      : []),
    {
      name: 'discussions',
      label: 'Discussions',
      Icon: MessagesSquare,
      badge: unread.total > 0 ? badgeCount(unread.total) : null,
    },
    ...(showQuotes ? [] : [{ name: 'recherche', label: 'Recherche', Icon: Search }]),
  ];

  return (
    <Tabs style={{ flex: 1, backgroundColor: t.bg }}>
      <TabSlot />
      <TabList style={{ display: 'none' }}>
        {showCockpit ? <TabTrigger name="cockpit" href="/hub/cockpit" /> : null}
        {showPreparation ? <TabTrigger name="preparation" href="/hub/preparation" /> : null}
        {showQuotes ? <TabTrigger name="devis" href="/hub/devis" /> : null}
        <TabTrigger name="discussions" href="/hub/discussions" />
        <TabTrigger name="recherche" href="/hub/recherche" />
      </TabList>
      <BatipowerTabBar items={items} onCenterPress={openHubMenu} centerLabel="Menu" />
    </Tabs>
  );
}
