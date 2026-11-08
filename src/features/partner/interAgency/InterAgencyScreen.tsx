import { useMemo, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { FilterPill } from '@/components/sheet/FilterPill';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { useTheme } from '@/theme';
import type { InterAgencyOrder } from '@/types/partnerInterAgency';

import { openInterAgencyFilters, openInterAgencyOrder } from '../navigation';
import { warehouseLabel } from '../products/constants';
import { ChipBar } from '../shared/ChipBar';
import { FilterPillRow, PartnerListScreen } from '../shared/PartnerListScreen';
import { plural } from '../shared/pages';
import { InterAgencyCard } from './components/InterAgencyCard';
import {
  patchInterAgencyFilters,
  useInterAgencyFilters,
  type InterAgencyStatusFilter,
} from './filtersStore';
import { useInterAgencyList } from './hooks/useInterAgencyOrders';
import { isMineOnly, lockedWarehouseFor } from './lib';

const keyExtractor = (order: InterAgencyOrder) =>
  `${order.reference}-${order.warehouseAffectation ?? ''}`;

const open = (order: InterAgencyOrder) =>
  openInterAgencyOrder(order.reference, order.warehouseAffectation ?? '');

const renderItem = (order: InterAgencyOrder) => <InterAgencyCard order={order} onPress={open} />;

/**
 * Inter-agences du module PARTNER : commandes confirmées par la logistique pour lesquelles il
 * faut organiser un transfert entre agences. Elles disparaissent dès leur expédition ; le back
 * cloisonne la liste au distributeur du compte. Réservé aux comptes hors « DEP uniquement ».
 */
export function InterAgencyScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const filters = useInterAgencyFilters();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  const list = useInterAgencyList(filters, term);
  const locked = lockedWarehouseFor(user);
  const mine = isMineOnly(filters, user);
  const activeCount = (mine ? 1 : 0) + (!locked && filters.warehouse ? 1 : 0);

  const pills = useMemo(
    () =>
      [
        mine ? (
          <FilterPill
            key="mine"
            label="Mes commandes"
            state="on"
            onPress={() => patchInterAgencyFilters({ mineOnly: false })}
            trailing={<X size={12} color={t.accentText} />}
          />
        ) : null,
        !locked && filters.warehouse ? (
          <FilterPill
            key="warehouse"
            label={warehouseLabel(filters.warehouse)}
            state="on"
            onPress={() => patchInterAgencyFilters({ warehouse: null })}
            trailing={<X size={12} color={t.accentText} />}
          />
        ) : null,
      ].filter(Boolean),
    [mine, locked, filters.warehouse, t.accentText],
  );

  return (
    <PartnerListScreen
      title="Inter-agences"
      list={list}
      totalLabel={
        list.total === null
          ? null
          : `${plural(list.total, 'commande')}${term ? ` · « ${term} »` : ''}`
      }
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      search={text}
      onSearchChange={setText}
      term={term}
      searchPlaceholder="Référence, acheteur, produit"
      toolbar={
        <ChipBar<InterAgencyStatusFilter>
          items={list.tabs}
          value={filters.status}
          onChange={(status) => patchInterAgencyFilters({ status })}
        />
      }
      activeFilterCount={activeCount}
      onOpenFilters={openInterAgencyFilters}
      filterPills={pills.length > 0 ? <FilterPillRow>{pills}</FilterPillRow> : null}
      errorFallback="Impossible de charger les inter-agences"
      emptyIcon={<ArrowRightLeft size={24} color={t.textMuted} />}
      emptyTitle="Aucune inter-agence en cours"
      emptyText="Les commandes confirmées par la logistique apparaissent ici jusqu'à leur expédition."
      emptyFilteredText="Aucune commande ne correspond à ces filtres."
      skeletonHeight={130}
    />
  );
}

