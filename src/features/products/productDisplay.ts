import type { BadgeTone } from '@/components/ui';
import type { HubAgencyStock, HubProductFlags } from '@/types/product';

/**
 * Affichage des fiches produit HUB, porté de
 * `front_externe_batipower/app/(app)/hub/produits/[ref]/_components`.
 */

/** URI affichable d'une miniature : le back renvoie du JPEG en base64, avec ou sans préfixe `data:`. */
export function thumbnailUri(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('data:') ? trimmed : `data:image/jpeg;base64,${trimmed}`;
}

export interface FlagBadge {
  label: string;
  tone: BadgeTone;
}

/** Pastilles d'état du produit ; « Actif » quand aucun drapeau particulier n'est levé. */
export function flagBadges(flags: HubProductFlags): FlagBadge[] {
  const badges: FlagBadge[] = [];
  if (flags.obsoletProduct) badges.push({ label: 'Obsolète', tone: 'red' });
  if (!flags.isActive) badges.push({ label: 'Inactif', tone: 'red' });
  if (flags.websiteActive === false) badges.push({ label: 'Hors site', tone: 'amber' });
  if (flags.siteStockForcedZero) badges.push({ label: 'Stock site forcé à 0', tone: 'amber' });
  if (flags.tooFragile) badges.push({ label: 'Fragile', tone: 'amber' });
  if (flags.tooVoluminous) badges.push({ label: 'Volumineux', tone: 'amber' });
  if (flags.depreciatedFlevy) badges.push({ label: 'Déprécié Flevy', tone: 'neutral' });
  if (flags.depreciatedDombasle) badges.push({ label: 'Déprécié Dombasle', tone: 'neutral' });
  return badges.length > 0 ? badges : [{ label: 'Actif', tone: 'green' }];
}

/**
 * Ordre de rapatriement J+1 depuis Dombasle, aligné sur `NEARBY_AGENCY_PRIORITY_ORDER` côté
 * back : Essey → Ludres → Maxéville → Nancy → Pont-à-Mousson.
 */
const NEARBY_DOMBASLE_CODES = ['25', '27', '28', '31', '33'];
const NEARBY_DOMBASLE_RANK = new Map<string, number>(
  NEARBY_DOMBASLE_CODES.map((code, index) => [code, index]),
);

/** Au-delà, l'inventaire est jugé périmé (même seuil que les mails acheteurs côté back : 72 h). */
const STALE_AFTER_MS = 72 * 60 * 60 * 1000;

export type AgencyGroupId = 'nearby' | 'otherDombasle' | 'flevy';

export interface AgencyGroup {
  id: AgencyGroupId;
  title: string;
  /** Agences à afficher : celles à 0 ne sont détaillées que pour les agences proches. */
  chips: HubAgencyStock[];
  total: number;
  inventoryAt: Date | null;
  stale: boolean;
}

const GROUP_TITLES: Record<AgencyGroupId, string> = {
  nearby: 'Agences proches',
  otherDombasle: 'Autres agences Dombasle',
  flevy: 'Agences Flevy',
};

const GROUP_ORDER: AgencyGroupId[] = ['nearby', 'otherDombasle', 'flevy'];

/** Date d'inventaire la plus récente du groupe (toutes ses agences partagent l'entrepôt parent). */
function latestInventory(chips: HubAgencyStock[]): Date | null {
  let latest: Date | null = null;
  for (const chip of chips) {
    if (!chip.inventoryAt) continue;
    const date = new Date(chip.inventoryAt);
    if (!Number.isNaN(date.getTime()) && (!latest || date > latest)) latest = date;
  }
  return latest;
}

/** Stock par agence au dernier inventaire eBatPro, groupé par priorité de rapatriement. */
export function groupAgencies(agencies: HubAgencyStock[], now = Date.now()): AgencyGroup[] {
  const grouped: Record<AgencyGroupId, HubAgencyStock[]> = {
    nearby: [],
    otherDombasle: [],
    flevy: [],
  };

  for (const agency of agencies) {
    if (agency.parentWarehouse === 'DOMBASLE' && NEARBY_DOMBASLE_RANK.has(agency.code)) {
      grouped.nearby.push(agency);
    } else if (agency.parentWarehouse === 'DOMBASLE') {
      grouped.otherDombasle.push(agency);
    } else {
      grouped.flevy.push(agency);
    }
  }

  grouped.nearby.sort(
    (a, b) => (NEARBY_DOMBASLE_RANK.get(a.code) ?? 99) - (NEARBY_DOMBASLE_RANK.get(b.code) ?? 99),
  );
  const byStock = (a: HubAgencyStock, b: HubAgencyStock) =>
    b.stock - a.stock || a.name.localeCompare(b.name, 'fr');
  grouped.otherDombasle.sort(byStock);
  grouped.flevy.sort(byStock);

  return GROUP_ORDER.filter((id) => grouped[id].length > 0).map((id) => {
    const all = grouped[id];
    const inventoryAt = latestInventory(all);
    return {
      id,
      title: GROUP_TITLES[id],
      chips: id === 'nearby' ? all : all.filter((chip) => chip.stock > 0),
      total: all.reduce((sum, chip) => sum + chip.stock, 0),
      inventoryAt,
      stale: !inventoryAt || now - inventoryAt.getTime() > STALE_AFTER_MS,
    };
  });
}
