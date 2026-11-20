import { useState } from 'react';
import { Text } from 'react-native';

import { DetailSection, Divider } from '@/components/ui';
import { ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { formatEuro, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';

import { PeriodChips } from './components/PeriodChips';
import { SalesBarChart } from './components/SalesBarChart';
import { SalesTable } from './components/SalesTable';
import { SelectedBucket } from './components/SelectedBucket';
import { useProductSalesDaily } from '../hooks/useProductSales';
import {
  SALES_PERIODS,
  evolutionSeries,
  hasAmounts,
  totalQuantity,
  type SalesPeriod,
} from './salesModel';

type EvolutionSectionProps = {
  reference: string;
  /** Colonne CA TTC : le back ne renvoie les montants quotidiens qu'aux comptes autorisés. */
  canSeeRevenue: boolean;
};

const PERIOD_HINT: Record<SalesPeriod, string> = {
  week: '7 derniers jours, jour par jour',
  month: '30 derniers jours, jour par jour',
  '3months': '90 derniers jours, semaine par semaine',
  year: '12 derniers mois, mois par mois',
};

/** Évolution des ventes sur une période (semaine, mois, 3 mois, année) : histogramme et détail. */
export function EvolutionSection({ reference, canSeeRevenue }: EvolutionSectionProps) {
  const styles = useStyles();
  const daily = useProductSalesDaily(reference);
  const [period, setPeriod] = useState<SalesPeriod>('month');
  const [selected, setSelected] = useState<string | null>(null);

  const buckets = evolutionSeries(daily.data?.points ?? [], period);
  const showAmount = canSeeRevenue && hasAmounts(buckets);
  const units = totalQuantity(buckets);
  const orders = buckets.reduce((sum, bucket) => sum + bucket.ordersCount, 0);
  const amount = buckets.reduce((sum, bucket) => sum + (bucket.amount ?? 0), 0);
  const selectedBucket = buckets.find((bucket) => bucket.key === selected) ?? null;
  const loading = daily.isPending && daily.fetchStatus !== 'idle';

  const changePeriod = (next: SalesPeriod) => {
    setPeriod(next);
    setSelected(null);
  };

  return (
    <DetailSection title="Évolution">
      <PeriodChips options={SALES_PERIODS} value={period} onChange={changePeriod} />
      <Text style={styles.hint}>{PERIOD_HINT[period]}</Text>

      {daily.error ? (
        <ErrorBanner
          error={daily.error}
          fallback="Impossible de charger l’évolution des ventes"
          onRetry={() => void daily.refetch()}
        />
      ) : null}

      {loading ? (
        <ListSkeleton rows={1} height={190} />
      ) : (
        <>
          <Text style={styles.total}>
            {formatInteger(units)} unités · {formatInteger(orders)} commandes
            {showAmount ? ` · ${formatEuro(amount)} TTC` : ''}
          </Text>
          {units === 0 ? (
            <Text style={styles.empty}>Aucune vente sur la période.</Text>
          ) : (
            <>
              <SalesBarChart
                buckets={buckets}
                selectedKey={selectedBucket?.key ?? null}
                onSelect={setSelected}
                accessibilityLabel={`Histogramme de l’évolution des ventes, ${PERIOD_HINT[period]}`}
              />
              <SelectedBucket bucket={selectedBucket} showAmount={showAmount} />
              <Divider />
              <SalesTable
                buckets={[...buckets].reverse()}
                showAmount={showAmount}
                selectedKey={selectedBucket?.key ?? null}
                onSelect={setSelected}
              />
            </>
          )}
        </>
      )}
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.xs, color: t.textSubtle },
  total: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  empty: { paddingVertical: spacing.lg, textAlign: 'center', fontSize: fontSize.sm, color: t.textFaint },
}));
