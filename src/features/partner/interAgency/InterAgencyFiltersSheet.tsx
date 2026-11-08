import { useMemo } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';

import { warehouseLabel } from '../products/constants';
import { OptionRow, ToggleRow } from '../shared/SheetRows';
import {
  clearInterAgencyFilters,
  patchInterAgencyFilters,
  useInterAgencyFilters,
} from './filtersStore';
import { useInterAgencyOrdersQuery } from './hooks/useInterAgencyOrders';
import { isMineOnly, lockedWarehouseFor } from './lib';

/** Filtres des inter-agences : « mes commandes » et entrepôt (verrouillé pour un compte rattaché). */
export function InterAgencyFiltersSheet() {
  const { user } = useAuth();
  const filters = useInterAgencyFilters();
  const orders = useInterAgencyOrdersQuery();
  const locked = lockedWarehouseFor(user);
  const mine = isMineOnly(filters, user);

  const warehouses = useMemo(() => {
    const codes = new Set<string>();
    for (const order of orders.data ?? []) {
      if (order.warehouseAffectation) codes.add(order.warehouseAffectation);
    }
    return [...codes].sort((a, b) => warehouseLabel(a).localeCompare(warehouseLabel(b), 'fr'));
  }, [orders.data]);

  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        disabled: !mine && !filters.warehouse,
        onPress: clearInterAgencyFilters,
      }}
    >
      <SheetSection title="Commandes">
        <ToggleRow
          label="Mes commandes uniquement"
          value={mine}
          onChange={(value) => patchInterAgencyFilters({ mineOnly: value })}
        />
      </SheetSection>

      {!locked ? (
        <SheetSection title="Entrepôt">
          <OptionRow
            label="Tous"
            selected={filters.warehouse === null}
            onPress={() => patchInterAgencyFilters({ warehouse: null })}
          />
          {warehouses.map((code) => (
            <OptionRow
              key={code}
              label={warehouseLabel(code)}
              selected={filters.warehouse === code}
              onPress={() => patchInterAgencyFilters({ warehouse: code })}
            />
          ))}
        </SheetSection>
      ) : null}
    </SheetScreen>
  );
}
