import type { BadgeTone } from '@/components/ui';

import type { InterAgencyStatusFilter } from './filtersStore';

export const INTER_AGENCY_STATUS_TABS: readonly {
  key: InterAgencyStatusFilter;
  label: string;
}[] = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'TODO', label: 'À traiter' },
  { key: 'DONE', label: 'Réalisées' },
  { key: 'IMPOSSIBLE', label: 'Impossibles' },
];

export type InterAgencyOrderStatus = Exclude<InterAgencyStatusFilter, 'ALL'>;

export const INTER_AGENCY_STATUS_META: Record<
  InterAgencyOrderStatus,
  { label: string; tone: BadgeTone }
> = {
  TODO: { label: 'À traiter', tone: 'amber' },
  DONE: { label: 'Réalisée', tone: 'green' },
  IMPOSSIBLE: { label: 'Impossible', tone: 'red' },
};

export const INTER_AGENCY_CHANNEL_LABELS = {
  logistics: 'Logistique',
  hub: 'HUB',
} as const;
