import { Text, View } from 'react-native';

import { originLabel, warehouseLabel } from '@/features/orders/orderDisplay';
import { formatInteger, formatPercent, formatShipHours } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing } from '@/theme';
import type { HubDashboardLogistics, HubWarehouseCompact } from '@/types/hubDashboard';

import { BarRow, DeltaChip, Panel, StatGrid, StatTile, SubTitle } from './CockpitPrimitives';

/** Entrepôts à afficher : la performance sur 30 j, à défaut le simple « à traiter » par entrepôt. */
function warehouseRows(logistics: HubDashboardLogistics): HubWarehouseCompact[] {
  if (logistics.byWarehouse && logistics.byWarehouse.length > 0) return logistics.byWarehouse;
  return Object.entries(logistics.warehouseTodo).map(([warehouse, todoCount]) => ({
    warehouse,
    ordersCount: 0,
    pendingCount: todoCount,
    overdue24h: logistics.unshippedOver24hByWarehouse[warehouse] ?? 0,
    overdue48h: logistics.unshippedOver48hByWarehouse[warehouse] ?? 0,
    todoCount,
    avgShipHours: null,
    shippedUnder48hPct: null,
  }));
}

type LogisticsCardProps = {
  logistics: HubDashboardLogistics;
};

/** Logistique : commandes du jour, retards d'expédition, entrepôts, alertes et collecte. */
export function LogisticsCard({ logistics }: LogisticsCardProps) {
  const styles = useStyles();
  const warehouses = warehouseRows(logistics);
  const origins = Object.entries(logistics.ordersTodayByOrigin).sort(([, a], [, b]) => b - a);

  return (
    <Panel title="Logistique">
      <StatGrid>
        <StatTile
          label="Commandes du jour"
          value={formatInteger(logistics.ordersToday)}
          hint={
            origins.map(([origin, count]) => `${originLabel(origin)} ${count}`).join(' · ') ||
            undefined
          }
        />
        <StatTile
          label="Non exp. > 24 h"
          value={formatInteger(logistics.unshippedOver24h)}
          tone={logistics.unshippedOver24h > 0 ? 'warning' : 'default'}
        />
        <StatTile
          label="Non exp. > 48 h"
          value={formatInteger(logistics.unshippedOver48h)}
          tone={logistics.unshippedOver48h > 0 ? 'danger' : 'default'}
        />
        <StatTile
          label="Devis palettes"
          value={`${formatInteger(logistics.palletQuotesPending)} à traiter`}
          hint={`${formatInteger(logistics.palletQuotesAnswered)} répondu${logistics.palletQuotesAnswered > 1 ? 's' : ''}`}
          tone={logistics.palletQuotesPending > 0 ? 'warning' : 'default'}
        />
      </StatGrid>

      {warehouses.length > 0 ? (
        <View style={styles.block}>
          <SubTitle>Performance par entrepôt · 30 j</SubTitle>
          {warehouses.map((row) => (
            <View key={row.warehouse} style={styles.warehouse}>
              <View style={styles.warehouseHeader}>
                <Text style={styles.warehouseName}>{warehouseLabel(row.warehouse)}</Text>
                <Text style={styles.warehousePending}>
                  {formatInteger(row.pendingCount)} en attente
                </Text>
              </View>
              <Text style={styles.warehouseMeta}>
                {[
                  `À traiter ${formatInteger(row.todoCount)}`,
                  row.overdue24h > 0 ? `${formatInteger(row.overdue24h)} > 24 h` : null,
                  row.overdue48h > 0 ? `${formatInteger(row.overdue48h)} > 48 h` : null,
                  row.avgShipHours !== null
                    ? `Délai moyen ${formatShipHours(row.avgShipHours)}`
                    : null,
                  row.shippedUnder48hPct !== null
                    ? `${formatPercent(row.shippedUnder48hPct, 0)} < 48 h`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.block}>
        <SubTitle>Alertes</SubTitle>
        <StatGrid>
          <StatTile
            label="Reliquats en retard"
            value={formatInteger(logistics.overdueBackorders)}
            tone={logistics.overdueBackorders > 0 ? 'warning' : 'default'}
          />
          <StatTile
            label="Tracking MP à notifier"
            value={formatInteger(logistics.unnotifiedMarketplaceShipping)}
            tone={logistics.unnotifiedMarketplaceShipping > 0 ? 'warning' : 'default'}
          />
          <StatTile
            label="Erreurs d'impression"
            value={formatInteger(logistics.printerErrors)}
            tone={logistics.printerErrors > 0 ? 'danger' : 'default'}
          />
        </StatGrid>
      </View>

      <View style={styles.block}>
        <SubTitle>Collecte</SubTitle>
        <BarRow
          label="Collecte du jour"
          value={logistics.colisCollectedToday}
          max={Math.max(logistics.colisExpectedToday, logistics.colisCollectedToday)}
          display={`${formatInteger(logistics.colisCollectedToday)} / ${formatInteger(logistics.colisExpectedToday)} colis`}
        />
        <View style={styles.monthly}>
          <View>
            <Text style={styles.monthlyLabel}>Colis du mois</Text>
            <Text style={styles.monthlyValue}>{formatInteger(logistics.colisMonthly)}</Text>
          </View>
          <View style={styles.monthlyDelta}>
            <DeltaChip
              current={logistics.colisMonthly}
              previous={logistics.colisMonthlyN1}
              context="par rapport à N-1"
            />
            <Text style={styles.monthlyHint}>N-1 : {formatInteger(logistics.colisMonthlyN1)}</Text>
          </View>
        </View>
      </View>
    </Panel>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: spacing.md },
  warehouse: {
    gap: 3,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  warehouseHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  warehouseName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  warehousePending: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  warehouseMeta: { fontSize: 11, lineHeight: 16, color: t.textSubtle },
  monthly: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthlyLabel: { fontSize: 11, fontWeight: '600', color: t.textSubtle },
  monthlyValue: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  monthlyDelta: { alignItems: 'flex-end', gap: 3 },
  monthlyHint: { fontSize: 11, color: t.textSubtle },
}));
