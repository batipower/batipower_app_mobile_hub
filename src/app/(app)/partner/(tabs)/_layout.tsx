import { ArrowRightLeft, Boxes, FileWarning, Tags } from 'lucide-react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessPartnerOpportunitiesStandard, partnerTabsFor } from '@/auth/permissions';
import { BatipowerTabBar, type TabBarItem } from '@/components/navigation/BatipowerTabBar';
import { badgeCount } from '@/features/discussions/shared/format';
import { usePartnerBadges } from '@/features/partner/hooks/usePartnerBadges';
import { openPartnerMenu } from '@/features/partner/navigation';
import { useTheme } from '@/theme';

/**
 * Onglets du module PARTNER, avec la barre flottante Batipower (`BatipowerTabBar`) comme dans le
 * HUB : onglets « headless » d'`expo-router/ui`, la `TabList` ne servant qu'à déclarer les routes
 * (masquée). Un onglet sans déclencheur est retiré de la navigation : chaque compte ne voit que
 * les pages auxquelles ses rôles donnent droit (cf. `partnerTabsFor`). Les pastilles portent les
 * messages produit à traiter, les opportunités à traiter et les BL à traiter. Le bouton central
 * (éclair) ouvre la feuille de menu déclarée dans `partner/_layout.tsx`.
 */
export default function PartnerTabsLayout() {
  const t = useTheme();
  const { user } = useAuth();
  const tabs = partnerTabsFor(user);
  const badges = usePartnerBadges(tabs, canAccessPartnerOpportunitiesStandard(user));
  if (!user) return null;

  const badge = (count: number) => (count > 0 ? badgeCount(count) : null);

  const items: TabBarItem[] = [
    ...(tabs.includes('produits')
      ? [{ name: 'produits', label: 'Produits', Icon: Boxes, badge: badge(badges.products) }]
      : []),
    ...(tabs.includes('opportunites')
      ? [{ name: 'opportunites', label: 'Opportunités', Icon: Tags, badge: badge(badges.opportunities) }]
      : []),
    ...(tabs.includes('inter-agences')
      ? [{ name: 'inter-agences', label: 'Inter-agences', Icon: ArrowRightLeft }]
      : []),
    ...(tabs.includes('bl')
      ? [{ name: 'bl', label: 'BL prix', Icon: FileWarning, badge: badge(badges.deliveryNotes) }]
      : []),
  ];

  return (
    <Tabs style={{ flex: 1, backgroundColor: t.bg }}>
      <TabSlot />
      <TabList style={{ display: 'none' }}>
        {tabs.includes('produits') ? <TabTrigger name="produits" href="/partner/produits" /> : null}
        {tabs.includes('opportunites') ? (
          <TabTrigger name="opportunites" href="/partner/opportunites" />
        ) : null}
        {tabs.includes('inter-agences') ? (
          <TabTrigger name="inter-agences" href="/partner/inter-agences" />
        ) : null}
        {tabs.includes('bl') ? <TabTrigger name="bl" href="/partner/bl" /> : null}
      </TabList>
      <BatipowerTabBar items={items} onCenterPress={openPartnerMenu} centerLabel="Menu" />
    </Tabs>
  );
}
