import type { PartnerLogo, SubsidiaryOption } from '@/types/admin';

/** Entrepôt du QG Batipower : aucune filiale partenaire. */
export const QG_WAREHOUSE_CODE = 'QG_BATIPOWER';

export interface SubsidiaryGroupMember {
  id: string;
  name: string;
  /** Logo servi par l'API ; `null` pour le QG Batipower (initiale). */
  logo: Pick<PartnerLogo, 'logoUrl' | 'logoNeedsLightBackground'> | null;
}

/**
 * Filtre « filiales » : les commandes sont rattachées à un entrepôt, pas à une filiale. Les filiales d'un
 * même entrepôt forment un seul groupe (un seul toggle, plusieurs logos).
 */
export interface SubsidiaryGroup {
  /** Code d'entrepôt envoyé au back (`warehouses`). */
  code: string;
  label: string;
  members: SubsidiaryGroupMember[];
}

export const QG_GROUP: SubsidiaryGroup = {
  code: QG_WAREHOUSE_CODE,
  label: 'Batipower (QG)',
  members: [{ id: 'batipower-qg', name: 'Batipower', logo: null }],
};

/** Regroupe les filiales actives par entrepôt ; le QG Batipower vient en premier, puis les entrepôts par nom. */
export function groupSubsidiariesByWarehouse(options: readonly SubsidiaryOption[]): SubsidiaryGroup[] {
  const groups = new Map<string, SubsidiaryGroup>();
  for (const option of options) {
    if (!option.isActive || !option.distributorActive) continue;
    const code = (option.warehouseCode ?? option.warehouse ?? '').toUpperCase();
    if (!code || code === QG_WAREHOUSE_CODE) continue;
    const group = groups.get(code) ?? { code, label: option.warehouseName, members: [] };
    group.members.push({ id: option.id, name: option.name, logo: option });
    groups.set(code, group);
  }
  for (const group of groups.values()) {
    group.members.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }
  return [
    QG_GROUP,
    ...[...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr')),
  ];
}
