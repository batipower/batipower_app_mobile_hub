import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Badge } from '@/components/ui';
import { originLabel, originTone } from '@/features/orders/orderDisplay';
import { formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubDailyMargin, HubDashboardFinance } from '@/types/hubDashboard';

import { parisDateKey } from '../dates';
import { MarginToggle, Panel, StatGrid, StatTile, SubTitle } from './CockpitPrimitives';

const WEBSITE = 'WEBSITE';

/** Marge en % du CA ; `null` si le CA est nul. */
function marginPercent(marginHT: number, caHT: number): number | null {
  return caHT > 0 ? (marginHT / caHT) * 100 : null;
}

type CaTodayCardProps = {
  finance: HubDashboardFinance;
  showMargin: boolean;
  onToggleMargin: () => void;
};

/**
 * CA HT du jour : total, répartition Site / Marketplaces et détail par canal. La marge du
 * jour vient du dernier point de `caHistory` (le jour courant), derrière la bascule « Marge ».
 */
export function CaTodayCard({ finance, showMargin, onToggleMargin }: CaTodayCardProps) {
  const styles = useStyles();

  const today = useMemo<HubDailyMargin | null>(() => {
    const last = finance.caHistory?.[finance.caHistory.length - 1];
    return last && last.date === parisDateKey() ? last : null;
  }, [finance.caHistory]);

  const channels = useMemo(
    () => [...finance.caTodayByOrigin].sort((a, b) => b.turnoverHT - a.turnoverHT),
    [finance.caTodayByOrigin],
  );
  const marginByOrigin = useMemo(
    () => new Map((today?.byOrigin ?? []).map((row) => [row.origin, row.marginHT])),
    [today],
  );

  const site = channels.find((row) => row.origin === WEBSITE);
  const marketplaces = channels.filter((row) => row.origin !== WEBSITE);
  const marketplacesCa = marketplaces.reduce((sum, row) => sum + row.turnoverHT, 0);
  const marketplacesOrders = marketplaces.reduce((sum, row) => sum + row.ordersCount, 0);
  const ordersCount = channels.reduce((sum, row) => sum + row.ordersCount, 0);
  const plural = (n: number) => `${formatInteger(n)} commande${n > 1 ? 's' : ''}`;

  const marginPct = today ? marginPercent(today.marginHT, today.caHT) : null;

  return (
    <Panel
      title="CA HT du jour"
      trailing={<MarginToggle visible={showMargin} onToggle={onToggleMargin} />}
    >
      <View style={styles.total}>
        <Text
          style={styles.totalValue}
          accessibilityLabel={`CA HT du jour : ${formatEuroWhole(finance.caTodayHT)}`}
        >
          {formatEuroWhole(finance.caTodayHT)}
        </Text>
        <Text style={styles.totalHint}>Total HT · {plural(ordersCount)}</Text>
      </View>

      <StatGrid>
        <StatTile
          label="Site"
          value={formatEuroWhole(site?.turnoverHT ?? 0)}
          hint={plural(site?.ordersCount ?? 0)}
        />
        <StatTile
          label="Marketplaces"
          value={formatEuroWhole(marketplacesCa)}
          hint={plural(marketplacesOrders)}
        />
        {today ? (
          <>
            <StatTile label="Colis" value={formatInteger(today.parcels)} />
            <StatTile label="Unités" value={formatInteger(today.units)} />
          </>
        ) : null}
        {showMargin && today ? (
          <StatTile
            label="Marge brute HT"
            value={formatEuroWhole(today.marginHT)}
            hint={marginPct !== null ? `${formatPercent(marginPct)} du CA` : undefined}
            tone={today.marginHT < 0 ? 'danger' : 'default'}
          />
        ) : null}
      </StatGrid>

      {channels.length > 0 ? (
        <View style={styles.channels}>
          <SubTitle>Par canal</SubTitle>
          {channels.map((row) => {
            const margin = marginByOrigin.get(row.origin);
            return (
              <View key={row.origin} style={styles.channelRow}>
                <Badge label={originLabel(row.origin)} tone={originTone(row.origin)} />
                <Text style={styles.channelOrders}>{plural(row.ordersCount)}</Text>
                <View style={styles.channelAmounts}>
                  <Text style={styles.channelCa}>{formatEuroWhole(row.turnoverHT)}</Text>
                  {showMargin && margin !== undefined ? (
                    <Text style={styles.channelMargin}>
                      Marge {formatEuroWhole(margin)}
                      {marginPercent(margin, row.turnoverHT) !== null
                        ? ` · ${formatPercent(marginPercent(margin, row.turnoverHT))}`
                        : ''}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.empty}>Aucune commande réalisée pour le moment.</Text>
      )}
    </Panel>
  );
}

const useStyles = makeStyles((t) => ({
  total: { gap: 2 },
  totalValue: { fontSize: 38, fontWeight: '800', letterSpacing: -0.5, color: t.text },
  totalHint: { fontSize: fontSize.xs, color: t.textSubtle },
  channels: { gap: spacing.md },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  channelOrders: { flex: 1, fontSize: fontSize.xs, color: t.textSubtle },
  channelAmounts: { alignItems: 'flex-end', gap: 1 },
  channelCa: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  channelMargin: { fontSize: 11, color: t.textSubtle },
  empty: { fontSize: fontSize.sm, color: t.textSubtle },
}));
