import { useMemo, useState } from 'react';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { roleLabel } from '@/modules/roles';
import { spacing } from '@/theme';
import type { AppUserRole } from '@/types/user';
import { router } from 'expo-router';

import { useSubsidiaryOptions, useWarehouseOptions } from '../hooks/useAdminOptions';
import {
  ALL_ROLES,
  CATEGORY_VALUES,
  LEGACY_WAREHOUSES,
  categoryLabel,
  warehouseLabel,
} from '../shared/accessRules';
import { SelectField } from '../shared/components/FormParts';
import {
  DEFAULT_ADMIN_USERS_FILTERS,
  UNASSIGNED_SUBSIDIARY,
  patchAdminUsersFilters,
  useAdminUsersFilters,
  type AdminUsersFilters,
} from './filtersStore';

/**
 * Feuille de filtres des utilisateurs : rôle, entrepôt, filiale et catégories. Les choix sont
 * modifiés dans un brouillon local et appliqués d'un coup avec « Appliquer ».
 */
export function UserFiltersSheet() {
  const current = useAdminUsersFilters();
  const [draft, setDraft] = useState<AdminUsersFilters>(current);
  const subsidiaries = useSubsidiaryOptions();
  const warehouses = useWarehouseOptions();

  const warehouseChoices = useMemo(
    () => [
      ...LEGACY_WAREHOUSES.map((w) => ({ value: w.value as string, label: w.label })),
      // Entrepôts libres de filiale (ex. LILLE), absents de l'enum historique.
      ...(warehouses.data ?? [])
        .filter((w) => !w.warehouse && w.code)
        .map((w) => ({ value: w.code as string, label: w.name })),
    ],
    [warehouses.data],
  );

  const subsidiaryChoices = useMemo(
    () => [
      { value: UNASSIGNED_SUBSIDIARY, label: 'Non rattachés' },
      ...(subsidiaries.data ?? []).map((s) => ({
        value: s.id,
        label: s.name,
        detail: `${s.distributorName} · ${s.warehouseName}`,
      })),
    ],
    [subsidiaries.data],
  );

  const subsidiaryLabel =
    draft.subsidiary === UNASSIGNED_SUBSIDIARY
      ? 'Non rattachés'
      : subsidiaries.data?.find((s) => s.id === draft.subsidiary)?.name ?? '';

  const apply = () => {
    patchAdminUsersFilters(draft);
    router.back();
  };

  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        onPress: () => setDraft(DEFAULT_ADMIN_USERS_FILTERS),
      }}
      footer={<Button label="Appliquer" onPress={apply} style={{ marginBottom: spacing.sm }} />}
    >
      <SelectField
        label="Rôle"
        valueLabel={draft.role ? roleLabel(draft.role) : ''}
        placeholder="Tous les rôles"
        noneLabel="Tous les rôles"
        searchable={false}
        options={ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
        selected={draft.role ? [draft.role] : []}
        onToggle={(role) => setDraft({ ...draft, role: role as AppUserRole | '' })}
      />
      <SelectField
        label="Entrepôt"
        valueLabel={draft.warehouse ? warehouseLabel(draft.warehouse) : ''}
        placeholder="Tous les entrepôts"
        noneLabel="Tous les entrepôts"
        options={warehouseChoices}
        selected={draft.warehouse ? [draft.warehouse] : []}
        onToggle={(warehouse) => setDraft({ ...draft, warehouse })}
      />
      <SelectField
        label="Filiale"
        valueLabel={subsidiaryLabel}
        placeholder="Toutes les filiales"
        noneLabel="Toutes les filiales"
        loading={subsidiaries.isLoading}
        error={subsidiaries.error}
        onRetry={() => void subsidiaries.refetch()}
        options={subsidiaryChoices}
        selected={draft.subsidiary ? [draft.subsidiary] : []}
        onToggle={(subsidiary) => setDraft({ ...draft, subsidiary })}
      />
      <SelectField
        label="Catégories"
        valueLabel={draft.categories.map(categoryLabel).join(', ')}
        placeholder="Toutes les catégories"
        multiple
        searchable={false}
        options={CATEGORY_VALUES.map((c) => ({ value: c, label: categoryLabel(c) }))}
        selected={draft.categories}
        onToggle={(cat) =>
          setDraft({
            ...draft,
            categories: draft.categories.includes(cat)
              ? draft.categories.filter((c) => c !== cat)
              : [...draft.categories, cat],
          })
        }
      />
    </SheetScreen>
  );
}
