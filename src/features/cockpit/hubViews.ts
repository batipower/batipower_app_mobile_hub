import { router, type Href } from 'expo-router';
import { Gauge, Globe, Handshake, Landmark, type LucideIcon } from 'lucide-react-native';

import {
  canAccessHubCockpit,
  canAccessHubPartnerStats,
  canAccessHubWebsiteDashboard,
  canViewHubFinance,
} from '@/auth/permissions';
import type { AppUserRole } from '@/types/user';

/** Vues de l'accueil HUB, pendant mobile des onglets de `HubHomePage` du front web. */
export type HubView = 'cockpit' | 'site' | 'partner' | 'financier';

type HubViewMeta = {
  label: string;
  href: Href;
  Icon: LucideIcon;
  allowed: (role: AppUserRole) => boolean;
};

const HUB_VIEWS: Record<HubView, HubViewMeta> = {
  cockpit: { label: 'Cockpit', href: '/hub/cockpit', Icon: Gauge, allowed: canAccessHubCockpit },
  site: {
    label: 'Site',
    href: '/hub/cockpit/site',
    Icon: Globe,
    allowed: canAccessHubWebsiteDashboard,
  },
  partner: {
    label: 'Stats PARTNER',
    href: '/hub/cockpit/partner',
    Icon: Handshake,
    allowed: canAccessHubPartnerStats,
  },
  financier: {
    label: 'Financier',
    href: '/hub/cockpit/financier',
    Icon: Landmark,
    allowed: canViewHubFinance,
  },
};

const VIEW_ORDER: readonly HubView[] = ['cockpit', 'site', 'partner', 'financier'];

export function hubViewMeta(view: HubView): HubViewMeta {
  return HUB_VIEWS[view];
}

/** Vues que le rôle peut ouvrir, dans l'ordre du web (Cockpit, Site, Stats PARTNER, Financier). */
export function hubViewsFor(role: AppUserRole): HubView[] {
  return VIEW_ORDER.filter((view) => HUB_VIEWS[view].allowed(role));
}

/**
 * Passe à une autre vue de l'accueil HUB. `replace` : la pile de l'onglet Cockpit ne grossit pas,
 * et l'appui sur l'onglet revient toujours à la vue Cockpit.
 */
export function openHubView(view: HubView) {
  router.replace(HUB_VIEWS[view].href);
}
