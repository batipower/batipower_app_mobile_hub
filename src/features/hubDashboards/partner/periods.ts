import type { PartnerStatsRange } from '@/types/hubPartnerStats';

/** Périodes proposées, reprises des présets du web (`PARTNER_STATS_PERIOD_PRESETS`, sans « Personnalisé »). */
export type PartnerPeriodKey = '30d' | 'last3m' | 'last12m' | 'ytd';

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Bornes `YYYY-MM-DD` d'une période (calendrier local, comme `resolvePeriodPreset` du web). */
export function resolvePartnerPeriod(
  key: PartnerPeriodKey,
  now: Date = new Date(),
): PartnerStatsRange {
  const endDate = isoDate(now);
  switch (key) {
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { startDate: isoDate(start), endDate };
    }
    case 'last3m':
      return { startDate: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), endDate };
    case 'last12m':
      return { startDate: isoDate(new Date(now.getFullYear(), now.getMonth() - 11, 1)), endDate };
    case 'ytd':
      return { startDate: `${now.getFullYear()}-01-01`, endDate };
  }
}

/** `2026-03-05` devient `05/03/2026`. */
export function formatIsoDateFr(value: string | undefined): string {
  const [y, m, d] = (value ?? '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : (value ?? '');
}
