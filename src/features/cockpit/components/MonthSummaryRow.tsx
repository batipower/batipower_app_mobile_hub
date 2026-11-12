import { formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import type { HubMonthSummary } from '@/types/hubDashboard';

import { StatGrid, StatTile } from './CockpitPrimitives';

type MonthSummaryRowProps = {
  summary: HubMonthSummary;
  showMargin: boolean;
};

/**
 * Cumul du mois en lecture seule : CA, commandes, marge (derrière la bascule), avoirs et CA
 * comptable net. Le détail des avoirs par cause et par origine reste sur le web.
 */
export function MonthSummaryRow({ summary, showMargin }: MonthSummaryRowProps) {
  const { accounting } = summary;
  const marginPct = summary.caHT > 0 ? (summary.marginHT / summary.caHT) * 100 : null;

  return (
    <StatGrid>
      <StatTile
        label="CA HT du mois"
        value={formatEuroWhole(summary.caHT)}
        hint={accounting ? 'Commandes, avant avoirs' : undefined}
      />
      <StatTile label="Commandes" value={formatInteger(summary.ordersCount)} />
      {showMargin ? (
        <StatTile
          label="Marge brute HT"
          value={formatEuroWhole(summary.marginHT)}
          hint={marginPct !== null ? `${formatPercent(marginPct)} du CA` : undefined}
          tone={summary.marginHT < 0 ? 'danger' : 'default'}
        />
      ) : null}
      {summary.creditSlipsHT !== null ? (
        <StatTile
          label="Avoirs HT"
          value={formatEuroWhole(summary.creditSlipsHT)}
          hint={
            summary.creditSlipsCount !== null
              ? `${formatInteger(summary.creditSlipsCount)} avoir${summary.creditSlipsCount > 1 ? 's' : ''}`
              : undefined
          }
          tone={summary.creditSlipsHT > 0 ? 'warning' : 'default'}
        />
      ) : null}
      {accounting ? (
        <StatTile
          label="CA comptable net"
          value={formatEuroWhole(accounting.netHT)}
          hint={`Factures ${formatEuroWhole(accounting.invoicedHT)} − avoirs ${formatEuroWhole(accounting.creditSlipsHT)}`}
        />
      ) : null}
    </StatGrid>
  );
}
