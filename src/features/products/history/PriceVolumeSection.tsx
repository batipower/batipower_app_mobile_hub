import { useState } from 'react';
import { Text, View } from 'react-native';

import { DetailSection, Divider, InfoRow } from '@/components/ui';
import { ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { originLabel } from '@/features/orders/orderDisplay';
import { formatEuro, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing } from '@/theme';
import type { HubStatsPeriod } from '@/types/product';

import { PeriodChips } from './components/PeriodChips';
import { useProductSalesStatistics } from '../hooks/useProductSales';

const STATS_PERIODS: readonly { key: HubStatsPeriod; label: string }[] = [
  { key: '1month', label: '1 mois' },
  { key: '3months', label: '3 mois' },
  { key: '6months', label: '6 mois' },
  { key: '1year', label: '1 an' },
];

type PriceVolumeSectionProps = {
  reference: string;
  /** CA TTC : SUPERADMIN uniquement (le back ne retire pas les montants des statistiques). */
  canSeeRevenue: boolean;
};

/** Prix et volumes vendus sur une période, avec le détail par marketplace. */
export function PriceVolumeSection({ reference, canSeeRevenue }: PriceVolumeSectionProps) {
  const styles = useStyles();
  const [period, setPeriod] = useState<HubStatsPeriod>('1month');
  const stats = useProductSalesStatistics(reference, period);
  const data = stats.data;
  const loading = stats.isPending && stats.fetchStatus !== 'idle';
  const summary = data?.summary;
  const empty = !summary || data?.status === 'no_data' || summary.totalQuantity === 0;
  const marketplaces = [...(data?.marketplaceStats ?? [])].sort((a, b) => b.quantity - a.quantity);

  return (
    <DetailSection title="Prix et volumes">
      <PeriodChips options={STATS_PERIODS} value={period} onChange={setPeriod} />

      {stats.error ? (
        <ErrorBanner
          error={stats.error}
          fallback="Impossible de charger les prix et volumes"
          onRetry={() => void stats.refetch()}
        />
      ) : null}

      {loading ? (
        <ListSkeleton rows={2} height={96} />
      ) : data && !stats.error ? (
        empty ? (
          <Text style={styles.empty}>Aucune vente sur la période.</Text>
        ) : (
          <>
            <InfoRow label="Quantité vendue" value={formatInteger(summary.totalQuantity)} />
            <InfoRow label="Commandes" value={formatInteger(summary.totalOrders)} />
            {canSeeRevenue ? <InfoRow label="CA TTC" value={formatEuro(summary.totalAmountTTC)} /> : null}
            <InfoRow label="Prix moyen TTC" value={formatEuro(summary.averagePrice)} />
            <InfoRow
              label="Prix min. / max."
              value={`${formatEuro(summary.priceMin)} / ${formatEuro(summary.priceMax)}`}
            />

            {marketplaces.length > 0 ? (
              <>
                <Divider />
                <Text style={styles.subtitle}>Par marketplace</Text>
                {marketplaces.map((marketplace) => (
                  <View key={marketplace.marketplace} style={styles.card}>
                    <Text style={styles.cardTitle}>{originLabel(marketplace.marketplace)}</Text>
                    <InfoRow label="Quantité" value={formatInteger(marketplace.quantity)} />
                    <InfoRow label="Commandes" value={formatInteger(marketplace.ordersCount)} />
                    {canSeeRevenue ? (
                      <InfoRow label="CA TTC" value={formatEuro(marketplace.totalAmountTTC)} />
                    ) : null}
                    <InfoRow label="Prix moyen" value={formatEuro(marketplace.averagePrice)} />
                    <InfoRow
                      label="Min. / max."
                      value={`${formatEuro(marketplace.priceMin)} / ${formatEuro(marketplace.priceMax)}`}
                    />
                  </View>
                ))}
              </>
            ) : null}
          </>
        )
      ) : null}
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  empty: { paddingVertical: spacing.lg, textAlign: 'center', fontSize: fontSize.sm, color: t.textFaint },
  subtitle: { fontSize: fontSize.xs, fontWeight: '700', color: t.textSubtle, textTransform: 'uppercase' },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
}));
