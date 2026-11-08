import { formatEuro } from '@/lib/format';

/** Écart signé « +1,20 € (+3,4 %) » ; « — » quand le back n'en fournit pas. */
export function formatDiff(absolute: number | null, percent: number | null): string {
  if (absolute == null) return '—';
  const sign = absolute > 0 ? '+' : '';
  const euros = `${sign}${formatEuro(absolute)}`;
  if (percent == null || !Number.isFinite(percent)) return euros;
  const pct = `${percent > 0 ? '+' : ''}${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(percent)} %`;
  return `${euros} (${pct})`;
}
