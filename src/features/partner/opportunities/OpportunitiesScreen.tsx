import { useMemo, useState } from 'react';
import { Tags, X } from 'lucide-react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { useTheme } from '@/theme';
import type { PartnerOpportunity } from '@/types/partnerOpportunities';

import { openOpportunity, openOpportunityFilters } from '../navigation';
import { ChipBar } from '../shared/ChipBar';
import { FilterPillRow, PartnerListScreen } from '../shared/PartnerListScreen';
import { plural } from '../shared/pages';
import { OpportunityCard } from './components/OpportunityCard';
import { OPPORTUNITY_STATUS_TABS } from './constants';
import {
  countActiveOpportunitiesFilters,
  patchOpportunitiesFilters,
  useOpportunitiesFilters,
  type OpportunityStatusFilter,
} from './filtersStore';
import { useOpportunityScope } from './hooks/useOpportunityScope';
import { useOpportunityCounts } from './hooks/useOpportunityCounts';
import { useOpportunityList } from './hooks/useOpportunityList';

const keyExtractor = (item: PartnerOpportunity) => item.uuid;
const renderItem = (item: PartnerOpportunity) => (
  <OpportunityCard item={item} onPress={openOpportunity} />
);

/**
 * Opportunités du module PARTNER : demandes de prix d'équilibre à traiter par les RA / RAR, en
 * Standard ou en DEP. Les comptes limités aux DEP n'ont que le périmètre DEP, sans segment.
 *
 * Les statuts sont des puces avec leur compteur (comme le web) plutôt qu'un simple « À traiter /
 * Traitées » : « traitée » n'existe que dans le statut « Ouvertes ».
 */
export function OpportunitiesScreen() {
  const t = useTheme();
  const filters = useOpportunitiesFilters();
  const { scope, canStandard } = useOpportunityScope();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  const effective = useMemo(() => ({ ...filters, scope }), [filters, scope]);
  const list = useOpportunityList(effective, term);
  const counts = useOpportunityCounts(scope);
  const activeCount = countActiveOpportunitiesFilters(filters);

  const statusItems = useMemo(
    () =>
      OPPORTUNITY_STATUS_TABS.map((tab) => ({
        ...tab,
        count: counts.data?.[tab.key],
      })),
    [counts.data],
  );

  const pills = [
    filters.brand ? (
      <FilterPill
        key="brand"
        label={filters.brand}
        state="on"
        onPress={() => patchOpportunitiesFilters({ brand: null })}
        trailing={<X size={12} color={t.accentText} />}
      />
    ) : null,
    filters.unreadOnly && filters.status === 'OPEN' ? (
      <FilterPill
        key="unread"
        label="Non lues"
        state="on"
        onPress={() => patchOpportunitiesFilters({ unreadOnly: false })}
        trailing={<X size={12} color={t.accentText} />}
      />
    ) : null,
  ].filter(Boolean);

  return (
    <PartnerListScreen
      title="Opportunités"
      list={list}
      totalLabel={
        list.total === null
          ? null
          : `${plural(list.total, 'opportunité')}${term ? ` · « ${term} »` : ''}`
      }
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      segments={
        canStandard
          ? [
              { key: 'STANDARD', label: 'Standard' },
              { key: 'DEP', label: 'DEP' },
            ]
          : undefined
      }
      segment={scope}
      // La marque n'est pas la même d'un périmètre à l'autre.
      onSegmentChange={(next) => patchOpportunitiesFilters({ scope: next, brand: null })}
      search={text}
      onSearchChange={setText}
      term={term}
      searchPlaceholder="Référence, EAN, désignation"
      toolbar={
        <ChipBar<OpportunityStatusFilter>
          items={statusItems}
          value={filters.status}
          onChange={(status) =>
            patchOpportunitiesFilters({ status, unreadOnly: status === 'OPEN' && filters.unreadOnly })
          }
        />
      }
      activeFilterCount={activeCount}
      onOpenFilters={openOpportunityFilters}
      filterPills={pills.length > 0 ? <FilterPillRow>{pills}</FilterPillRow> : null}
      errorFallback="Impossible de charger les opportunités"
      emptyIcon={<Tags size={24} color={t.textMuted} />}
      emptyTitle="Aucune opportunité"
      emptyText="Aucune opportunité dans ce statut pour le moment."
      emptyFilteredText="Aucune opportunité ne correspond à ces filtres."
      skeletonHeight={150}
    />
  );
}
