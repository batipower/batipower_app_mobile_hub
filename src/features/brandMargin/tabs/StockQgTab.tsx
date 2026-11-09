import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Warehouse } from 'lucide-react-native';

import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { formatDateTime, formatEuro, formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { HubBrandStockQg, HubBrandStockQgLine } from '@/types/hubBrandMargin';

import { Kpi, KpiGrid } from '../components/primitives';
import { ShowMoreButton, useShowMore } from '../components/rows';

const COST_SOURCE_LABELS: Record<HubBrandStockQgLine['costSource'], string> = {
  'qg-average': 'Coût moyen du stock QG',
  'fix-price': "Prix d'achat fixé (repli)",
  none: 'Aucun coût : hors valeur',
};

type StockQgTabProps = {
  data: HubBrandStockQg | null;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
};

/** Stock QG Batipower de la marque, à l'instant t : indépendant de la période, du canal et de la vue SAV. */
export function StockQgTab({ data, loading, error, onRetry }: StockQgTabProps) {
  const styles = useStyles();
  const t = useTheme();
  const [search, setSearch] = useState('');

  const lines = useMemo(() => {
    if (!data) return [];
    const needle = normalizeForSearch(search);
    return needle
      ? data.lines.filter(
          (line) =>
            normalizeForSearch(line.reference).includes(needle) ||
            normalizeForSearch(line.designation ?? '').includes(needle),
        )
      : data.lines;
  }, [data, search]);
  const more = useShowMore(lines);

  if (!data) {
    return loading ? (
      <ListSkeleton rows={4} height={110} />
    ) : (
      <ErrorBanner error={error} fallback="Impossible de charger le stock QG" onRetry={onRetry} />
    );
  }

  return (
    <View style={styles.root}>
      <KpiGrid>
        <Kpi label="Valeur du stock" value={formatEuroWhole(data.valueHT)} hint="HT, coût du QG" />
        <Kpi label="Pièces" value={formatInteger(data.units)} />
        <Kpi label="Références" value={formatInteger(data.productsWithStock)} hint="en stock" />
        <Kpi
          label="Sans coût"
          value={formatInteger(data.unpricedProducts)}
          hint={`${formatInteger(data.unpricedUnits)} pièces hors valeur`}
          color={data.unpricedProducts > 0 ? t.warning : undefined}
        />
      </KpiGrid>
      {error ? (
        <ErrorBanner error={error} fallback="Actualisation impossible" onRetry={onRetry} />
      ) : null}
      <Text style={styles.note}>
        {`Instantané du ${formatDateTime(data.computedAt) ?? '—'}, indépendant de la période et de la marketplace.`}
      </Text>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Référence ou désignation" />

      {lines.length === 0 ? (
        <EmptyState
          icon={<Warehouse size={24} color={t.textMuted} />}
          title="Aucun stock"
          text={search ? 'Aucune référence ne correspond.' : 'Aucune référence de la marque en stock au QG.'}
        />
      ) : (
        <>
          {more.visible.map((line) => {
            const share = data.valueHT > 0 ? (line.valueHT / data.valueHT) * 100 : null;
            return (
              <View
                key={line.reference}
                style={styles.card}
                accessible
                accessibilityLabel={`${line.designation ?? line.reference}, ${line.stock} pièces, valeur ${formatEuroWhole(line.valueHT)}`}
              >
                <Text style={styles.title} numberOfLines={2}>
                  {line.designation ?? line.reference}
                </Text>
                <Text style={styles.reference} numberOfLines={1}>
                  {line.reference}
                </Text>
                <View style={styles.figures}>
                  <Figure label="Stock" value={formatInteger(line.stock)} />
                  <Figure
                    label="Coût unit."
                    value={line.unitCostHT != null ? formatEuro(line.unitCostHT) : '—'}
                  />
                  <Figure label="Valeur" value={formatEuroWhole(line.valueHT)} />
                  <Figure label="Part" value={formatPercent(share, 0)} />
                </View>
                <Text style={styles.reference}>{COST_SOURCE_LABELS[line.costSource]}</Text>
              </View>
            );
          })}
          {more.hasMore ? (
            <ShowMoreButton remaining={more.remaining} onPress={more.showMore} />
          ) : null}
        </>
      )}
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.figure}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  note: { fontSize: fontSize.xs, color: t.textMuted },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  reference: { fontSize: fontSize.xs, color: t.textMuted, fontFamily: monoFontFamily },
  figures: { flexDirection: 'row', gap: spacing.md },
  figure: { flex: 1, gap: 1 },
  caption: { fontSize: 11, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase' },
  value: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
}));
