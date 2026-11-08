import { formatEuro } from '@/lib/format';
import type { NegotiationRequest } from '@/types/hubProductAnalyzer';

const KIND_LABEL: Record<NegotiationRequest['kind'], string> = {
  NEGO: 'Négo',
  NEGO_ORIGIN: 'Négo d’origine',
  DEP: 'DEP',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'ouverte',
  IN_NEGOTIATION: 'en négo',
  WON: 'gagnée',
  STANDBY: 'standby',
  PRE_LAUNCH: 'pré-lancement',
  AWAITING_LAUNCH: 'attente lancement',
  LAUNCHED: 'lancée',
  ARCHIVED: 'archivée',
  REFUSED: 'refusée',
  ABANDONED: 'abandonnée',
};

/** « Négo ouverte », « DEP », « Négo d'origine · gagnée »… */
export function requestLabel(r: NegotiationRequest): string {
  const status = r.status ? (STATUS_LABEL[r.status] ?? r.status.toLowerCase()) : null;
  return status ? `${KIND_LABEL[r.kind]} ${status}` : KIND_LABEL[r.kind];
}

/** Le prix demandé n'est modifiable que sur la ligne de négo elle-même, tant qu'elle est ouverte. */
export function canEditRequestPrice(r: NegotiationRequest): boolean {
  return r.kind === 'NEGO' && r.status === 'OPEN' && !!r.opportunityUuid && r.requestedMinPriceHT != null;
}

/** « 2 · 7,75 € → 8,10 € » (ou un seul prix s'ils sont égaux, ou le seul nombre sans prix). */
export function summarizeRequests(requests: NegotiationRequest[]): string {
  const prices = requests.map((r) => r.requestedMinPriceHT).filter((p): p is number => p != null);
  if (prices.length === 0) return String(requests.length);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return `${requests.length} · ${min === max ? formatEuro(min) : `${formatEuro(min)} → ${formatEuro(max)}`}`;
}

export function groupByWarehouse(requests: NegotiationRequest[]): [string, NegotiationRequest[]][] {
  const map = new Map<string, NegotiationRequest[]>();
  for (const r of requests) {
    const key = r.warehouse ?? 'Sans entrepôt';
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
}
