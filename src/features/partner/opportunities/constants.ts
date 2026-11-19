import type { BadgeTone } from '@/components/ui';
import type { PartnerOpportunity, PartnerOpportunityStatus } from '@/types/partnerOpportunities';

import type { OpportunityStatusFilter } from './filtersStore';

/** Statuts de la barre de puces, dans l'ordre du web (`STATUS_TABS`). */
export const OPPORTUNITY_STATUS_TABS: readonly {
  key: OpportunityStatusFilter;
  label: string;
}[] = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'OPEN', label: 'Ouvertes' },
  { key: 'IN_NEGOTIATION', label: 'En négociation' },
  { key: 'STANDBY', label: 'En standby' },
  { key: 'WON', label: 'Acceptées' },
  { key: 'PRE_LAUNCH', label: 'En observation' },
  { key: 'ABANDONED', label: 'Abandonnées' },
  { key: 'AWAITING_LAUNCH', label: 'Att. lancement' },
  { key: 'LAUNCHED', label: 'Lancées' },
  { key: 'ARCHIVED', label: 'Archivées' },
];

export const OPPORTUNITY_STATUS_META: Record<
  PartnerOpportunityStatus,
  { label: string; tone: BadgeTone }
> = {
  OPEN: { label: 'Ouverte', tone: 'green' },
  IN_NEGOTIATION: { label: 'En négociation', tone: 'amber' },
  WON: { label: 'Acceptée', tone: 'green' },
  REFUSED: { label: 'Refusée', tone: 'red' },
  ABANDONED: { label: 'Abandonnée', tone: 'amber' },
  STANDBY: { label: 'En standby', tone: 'purple' },
  PRE_LAUNCH: { label: 'En observation', tone: 'purple' },
  AWAITING_LAUNCH: { label: 'Att. lancement', tone: 'amber' },
  LAUNCHED: { label: 'Lancée', tone: 'blue' },
  ARCHIVED: { label: 'Archivée', tone: 'neutral' },
  CANCELLED: { label: 'Annulée', tone: 'neutral' },
};

/** Standby automatique d'un produit de plus de 30 kg (reprise réservée au SUPERADMIN, sur le web). */
export const TOO_HEAVY_BADGE = { label: 'Trop lourd – pas encore géré', tone: 'red' } as const satisfies {
  label: string;
  tone: BadgeTone;
};

export function isTooHeavyStandby(item: Pick<PartnerOpportunity, 'status' | 'standbyReason'>): boolean {
  return item.status === 'STANDBY' && item.standbyReason === 'TOO_HEAVY';
}
