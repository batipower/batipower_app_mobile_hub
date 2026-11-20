import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { hubProductsApi } from '@/api/hubProducts';
import { Badge, Button, DetailSection, Divider } from '@/components/ui';
import { pricingRowKey } from '@/features/pricing/hooks/usePricingRow';
import { PRICING_LIST_KEY } from '@/features/pricing/queryKeys';
import { ErrorBanner, errorMessage } from '@/features/preparation/components/ListState';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubProductHeader } from '@/types/product';

import { SalesBarChart } from './components/SalesBarChart';
import { SalesTable } from './components/SalesTable';
import { SelectedBucket } from './components/SelectedBucket';
import { useProductSalesDaily } from '../hooks/useProductSales';
import { hasAmounts, monthlySalesBreakdown, monthlySalesSeries } from './salesModel';

type MonthlySalesSectionProps = {
  header: HubProductHeader;
  /** Colonne CA TTC : SUPERADMIN uniquement (le back n'envoie pas les montants au MANAGER). */
  canSeeRevenue: boolean;
  /** Appliquer la suggestion comme prévision enregistrée : SUPERADMIN uniquement. */
  canEdit: boolean;
};

/**
 * Ventes mensuelles sur 12 mois et prévisions : histogramme (M-1 à M-3 en couleur pleine, mois en
 * cours plus clair, lignes prévision enregistrée et suggérée), détail mois par mois, prévision
 * suggérée (M-1×0,5 + M-2×0,3 + M-3×0,2) applicable par le SUPERADMIN et prévisions par pays.
 */
export function MonthlySalesSection({ header, canSeeRevenue, canEdit }: MonthlySalesSectionProps) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const daily = useProductSalesDaily(header.reference);
  const series = monthlySalesSeries(header.salesQuantities, daily.data?.points ?? [], 12);
  const breakdown = monthlySalesBreakdown(header.salesQuantities, header.previSalesByMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const showAmount = canSeeRevenue && hasAmounts(series);
  const forecast = header.previSalesByMonth ?? null;
  const countries = Object.entries(header.monthlyForecastByCountry ?? {});
  const selectedBucket = series.find((bucket) => bucket.key === selected) ?? series.at(-1) ?? null;
  const noSales = series.every((bucket) => bucket.quantity === 0);

  const applyMutation = useMutation({
    mutationFn: (value: number) =>
      hubProductsApi.update(header.reference, { previSalesByMonth: value }),
    onSuccess: async () => {
      toast.success('Prévision mensuelle mise à jour');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hub-product-header', header.reference] }),
        queryClient.invalidateQueries({ queryKey: PRICING_LIST_KEY }),
        queryClient.invalidateQueries({ queryKey: pricingRowKey(header.reference) }),
      ]);
    },
    onError: (error) => toast.error(errorMessage(error, 'Mise à jour de la prévision impossible')),
  });

  const confirmApply = () =>
    Alert.alert(
      'Appliquer la suggestion',
      `La prévision enregistrée de ${header.reference} passera à ${breakdown.previSuggere} u/mois.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appliquer', onPress: () => applyMutation.mutate(breakdown.previSuggere) },
      ],
    );

  return (
    <DetailSection title="Ventes mensuelles et prévisions">
      {daily.error ? (
        <ErrorBanner
          error={daily.error}
          fallback="Impossible de charger les ventes détaillées"
          onRetry={() => void daily.refetch()}
        />
      ) : null}

      {noSales ? (
        <Text style={styles.empty}>Aucune vente sur les 12 derniers mois.</Text>
      ) : (
        <>
          <SalesBarChart
            buckets={series}
            selectedKey={selectedBucket?.key ?? null}
            onSelect={setSelected}
            forecast={forecast}
            suggestion={breakdown.previSuggere}
            accessibilityLabel="Histogramme des ventes mensuelles sur 12 mois, en unités"
          />
          <View style={styles.legend}>
            <LegendDot filled label="M-1 à M-3 (base de la suggestion)" />
            <LegendDot label="Mois en cours" light />
            {forecast != null && forecast > 0 ? <Text style={styles.legendText}>— Prévision</Text> : null}
            {breakdown.previSuggere > 0 ? <Text style={styles.legendText}>┄ Suggestion</Text> : null}
          </View>
          <SelectedBucket bucket={selectedBucket} showAmount={showAmount} />
          <SalesTable
            buckets={[...series].reverse()}
            showAmount={showAmount}
            selectedKey={selectedBucket?.key ?? null}
            onSelect={setSelected}
          />
        </>
      )}

      <Divider />
      <View style={styles.forecastRow}>
        <View style={styles.forecastCell}>
          <Text style={styles.forecastLabel}>Prévision enregistrée</Text>
          <Text style={styles.forecastValue}>{forecast != null ? `${formatInteger(forecast)} u/mois` : '—'}</Text>
        </View>
        <View style={[styles.forecastCell, styles.forecastEnd]}>
          <Text style={styles.forecastLabel}>Suggestion</Text>
          <Text style={styles.forecastValue}>
            {formatInteger(breakdown.previSuggere)} u/mois
            {breakdown.ecartPct !== 0 ? (
              <Text style={breakdown.ecartPct > 0 ? styles.up : styles.down}>
                {'  '}
                {breakdown.ecartPct > 0 ? '+' : ''}
                {breakdown.ecartPct} %
              </Text>
            ) : null}
          </Text>
        </View>
      </View>
      <Text style={styles.hint}>
        Suggestion = M-1 × 0,5 + M-2 × 0,3 + M-3 × 0,2 ({formatInteger(breakdown.m1)}, {formatInteger(breakdown.m2)},{' '}
        {formatInteger(breakdown.m3)} unités).
      </Text>
      {canEdit ? (
        <Button
          label="Appliquer la suggestion"
          variant="outline"
          loading={applyMutation.isPending}
          disabled={breakdown.previSuggere <= 0 || breakdown.previSuggere === forecast}
          onPress={confirmApply}
        />
      ) : null}

      {countries.length > 0 ? (
        <>
          <Divider />
          <Text style={styles.forecastLabel}>Ventes sur 30 jours par pays</Text>
          <View style={styles.countries}>
            {countries.map(([country, entry]) => (
              <Badge
                key={country}
                label={`${country} : ${entry.unitsSold30d != null ? formatInteger(entry.unitsSold30d) : '—'} u.`}
              />
            ))}
          </View>
        </>
      ) : null}
    </DetailSection>
  );
}

function LegendDot({ label, light = false, filled = false }: { label: string; light?: boolean; filled?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, light && styles.dotLight, filled && styles.dotFilled]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  empty: { paddingVertical: spacing.lg, textAlign: 'center', fontSize: fontSize.sm, color: t.textFaint },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendText: { fontSize: 11, color: t.textMuted },
  dot: { width: 9, height: 9, borderRadius: 2, backgroundColor: t.accent },
  dotFilled: { backgroundColor: t.accent },
  dotLight: { opacity: 0.4 },
  forecastRow: { flexDirection: 'row', gap: spacing.lg },
  forecastCell: { flex: 1, gap: 2 },
  forecastEnd: { alignItems: 'flex-end' },
  forecastLabel: { fontSize: fontSize.xs, color: t.textSubtle },
  forecastValue: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  up: { fontSize: fontSize.sm, fontWeight: '700', color: t.success },
  down: { fontSize: fontSize.sm, fontWeight: '700', color: t.danger },
  countries: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
