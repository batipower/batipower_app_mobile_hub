import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshCw, TriangleAlert } from 'lucide-react-native';

import { formatDateTime, formatEuroWhole, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { usePricingState } from '../filtersStore';
import { useStockValuation } from '../hooks/useStockValuation';

/**
 * Valorisation du stock QG de la sélection (stock × prix d'achat HT). Affichée seulement
 * quand le filtre « avec stock QG » est actif, comme `StockValuationStrip` du web.
 */
export function StockValuationStrip() {
  const styles = useStyles();
  const t = useTheme();
  const { filters } = usePricingState();
  const valuation = useStockValuation(filters);

  if (!valuation.active) return null;
  const { data } = valuation;

  return (
    <View style={styles.strip}>
      <View style={styles.header}>
        <Text style={styles.title}>Valorisation du stock QG</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recalculer la valorisation"
          hitSlop={12}
          onPress={() => void valuation.refetch()}
          disabled={valuation.refreshing}
        >
          {valuation.refreshing ? (
            <ActivityIndicator size="small" color={t.accentText} />
          ) : (
            <RefreshCw size={16} color={t.accentText} />
          )}
        </Pressable>
      </View>

      {valuation.loading ? (
        <ActivityIndicator color={t.accentText} style={styles.loader} />
      ) : valuation.error || !data ? (
        <Text style={styles.error}>Valorisation indisponible.</Text>
      ) : (
        <>
          <Text style={styles.value}>{formatEuroWhole(data.valueHT)} HT</Text>
          <Text style={styles.meta}>
            {formatInteger(data.units)} unités · {formatInteger(data.productsWithStock)} références
            en stock
          </Text>
          {data.unpricedProducts > 0 ? (
            <View style={styles.warning}>
              <TriangleAlert size={14} color={t.warning} />
              <Text style={styles.warningText}>
                {formatInteger(data.unpricedProducts)} référence(s) sans prix d&apos;achat (
                {formatInteger(data.unpricedUnits)} unités) exclues du total.
              </Text>
            </View>
          ) : null}
          <Text style={styles.computed}>Calculé le {formatDateTime(data.computedAt) ?? '—'}</Text>
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  strip: {
    marginHorizontal: spacing.xl,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: withAlpha(t.accent, 0.4),
    backgroundColor: withAlpha(t.accent, 0.08),
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
  loader: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  value: { fontSize: fontSize['2xl'], fontWeight: '800', color: t.text },
  meta: { fontSize: fontSize.sm, color: t.textMuted },
  error: { fontSize: fontSize.sm, color: t.danger },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  warningText: { flex: 1, fontSize: fontSize.xs, color: t.warning },
  computed: { fontSize: 11, color: t.textSubtle, marginTop: spacing.xs },
}));
