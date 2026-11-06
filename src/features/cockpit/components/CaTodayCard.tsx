import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { OriginLogo } from '@/features/orders/components/OriginLogo';
import { originLabel } from '@/features/orders/orderDisplay';
import { formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { HubDailyMargin, HubDashboardFinance } from '@/types/hubDashboard';

import { parisDateKey } from '../dates';
import { MARKETPLACES_FILTER, openDayOrders } from '../navigation';
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
  const t = useTheme();

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

  // Les commandes du jour courant ; `showMargin` suit la bascule « Marge » du cockpit.
  const dayKey = today?.date ?? parisDateKey();
  const openOrders = (origin?: string) => () =>
    openDayOrders(dayKey, { origin, margin: showMargin });

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
          icon={<OriginLogo origin={WEBSITE} size={18} />}
          value={formatEuroWhole(site?.turnoverHT ?? 0)}
          hint={plural(site?.ordersCount ?? 0)}
          onPress={site ? openOrders(WEBSITE) : undefined}
        />
        <StatTile
          label="Marketplaces"
          value={formatEuroWhole(marketplacesCa)}
          hint={plural(marketplacesOrders)}
          onPress={marketplaces.length > 0 ? openOrders(MARKETPLACES_FILTER) : undefined}
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
              <Pressable
                key={row.origin}
                onPress={openOrders(row.origin)}
                accessibilityRole="button"
                accessibilityLabel={`${originLabel(row.origin)}, ${plural(row.ordersCount)}, ${formatEuroWhole(row.turnoverHT)} HT. Voir les commandes`}
                style={({ pressed }) => [styles.channelRow, pressed && { backgroundColor: t.cardPressed }]}
              >
                <OriginLogo origin={row.origin} size={32} />
                <View style={styles.channelInfo}>
                  <Text style={styles.channelName} numberOfLines={1}>
                    {originLabel(row.origin)}
                  </Text>
                  <Text style={styles.channelOrders}>{plural(row.ordersCount)}</Text>
                </View>
                <View style={styles.channelAmounts}>
                  <Text style={styles.channelCa}>{formatEuroWhole(row.turnoverHT)}</Text>
                  {showMargin && margin !== undefined ? (
                    <Text
                      style={[styles.channelMargin, margin < 0 && { color: t.danger }]}
                    >
                      Marge {formatEuroWhole(margin)}
                      {marginPercent(margin, row.turnoverHT) !== null
                        ? ` · ${formatPercent(marginPercent(margin, row.turnoverHT))}`
                        : ''}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={16} color={t.textFaint} />
              </Pressable>
            );
          })}
          <Pressable
            onPress={openOrders()}
            accessibilityRole="button"
            accessibilityLabel="Voir toutes les commandes du jour"
            style={({ pressed }) => [styles.allOrders, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.allOrdersText}>Toutes les commandes du jour</Text>
            <ChevronRight size={16} color={t.accentText} />
          </Pressable>
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
  channels: { gap: spacing.sm },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    marginHorizontal: -spacing.sm,
    borderRadius: radius.md,
  },
  channelInfo: { flex: 1, gap: 1 },
  channelName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  channelOrders: { fontSize: fontSize.xs, color: t.textSubtle },
  channelAmounts: { alignItems: 'flex-end', gap: 1 },
  channelCa: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  channelMargin: { fontSize: 11, color: t.textSubtle },
  allOrders: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  allOrdersText: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  empty: { fontSize: fontSize.sm, color: t.textSubtle },
}));
