import { Building2, ShieldAlert, ShieldCheck, Users } from 'lucide-react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { BatipowerTabBar, type TabBarItem } from '@/components/navigation/BatipowerTabBar';
import { useAdminPendingCounts } from '@/features/admin/hooks/useAdminPendingCounts';
import { openAdminMenu } from '@/features/admin/navigation';
import { badgeCount } from '@/features/discussions/shared/format';
import { useTheme } from '@/theme';

/**
 * Onglets du module ADMIN, avec la barre flottante Batipower (`BatipowerTabBar`) comme dans le HUB :
 * onglets « headless » d'`expo-router/ui`, la `TabList` ne servant qu'à déclarer les routes
 * (masquée). Inscriptions porte le nombre de demandes en attente, Plateforme celui des demandes de
 * clés API. Le bouton central (éclair) ouvre la feuille de menu déclarée dans `admin/_layout.tsx`.
 */
export default function AdminTabsLayout() {
  const t = useTheme();
  const { registrations, apiKeyRequests } = useAdminPendingCounts();

  const items: TabBarItem[] = [
    { name: 'utilisateurs', label: 'Utilisateurs', Icon: Users },
    {
      name: 'inscriptions',
      label: 'Inscriptions',
      Icon: ShieldCheck,
      badge: registrations > 0 ? badgeCount(registrations) : null,
    },
    { name: 'partenaires', label: 'Partenaires', Icon: Building2 },
    {
      name: 'plateforme',
      label: 'Plateforme',
      Icon: ShieldAlert,
      badge: apiKeyRequests > 0 ? badgeCount(apiKeyRequests) : null,
    },
  ];

  return (
    <Tabs style={{ flex: 1, backgroundColor: t.bg }}>
      <TabSlot />
      <TabList style={{ display: 'none' }}>
        <TabTrigger name="utilisateurs" href="/admin/utilisateurs" />
        <TabTrigger name="inscriptions" href="/admin/inscriptions" />
        <TabTrigger name="partenaires" href="/admin/partenaires" />
        <TabTrigger name="plateforme" href="/admin/plateforme" />
      </TabList>
      <BatipowerTabBar items={items} onCenterPress={openAdminMenu} centerLabel="Menu" />
    </Tabs>
  );
}
