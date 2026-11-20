import { Pressable, Text, View } from 'react-native';

import { formatEuro, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, withAlpha } from '@/theme';

import type { SalesBucket } from '../salesModel';

type SalesTableProps = {
  /** Périodes à lister, dans l'ordre d'affichage (la plus récente en premier). */
  buckets: readonly SalesBucket[];
  /** Colonne CA TTC : réservée aux comptes qui reçoivent les montants (SUPERADMIN). */
  showAmount: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

/** Tableau détaillé des ventes par période : unités, commandes et CA TTC. */
export function SalesTable({ buckets, showAmount, selectedKey, onSelect }: SalesTableProps) {
  const styles = useStyles();
  return (
    <View accessibilityRole="list">
      <View style={styles.row}>
        <Text style={[styles.headCell, styles.labelCell]}>Période</Text>
        <Text style={[styles.headCell, styles.numCell]}>Unités</Text>
        <Text style={[styles.headCell, styles.numCell]}>Cmd.</Text>
        {showAmount ? <Text style={[styles.headCell, styles.amountCell]}>CA TTC</Text> : null}
      </View>
      {buckets.map((bucket) => {
        const selected = bucket.key === selectedKey;
        const empty = bucket.quantity === 0 && bucket.ordersCount === 0;
        return (
          <Pressable
            key={bucket.key}
            onPress={() => onSelect(bucket.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${bucket.fullLabel}${bucket.isCurrent ? ', en cours' : ''} : ${bucket.quantity} unités, ${bucket.ordersCount} commandes${
              showAmount && bucket.amount != null ? `, ${formatEuro(bucket.amount)} TTC` : ''
            }`}
            style={[styles.row, styles.bodyRow, selected && styles.rowSelected, empty && styles.rowEmpty]}
          >
            <Text style={[styles.cell, styles.labelCell]} numberOfLines={1}>
              {bucket.fullLabel}
              {bucket.isCurrent ? ' (en cours)' : ''}
            </Text>
            <Text style={[styles.cell, styles.numCell, styles.strong]}>
              {formatInteger(bucket.quantity)}
            </Text>
            <Text style={[styles.cell, styles.numCell]}>{formatInteger(bucket.ordersCount)}</Text>
            {showAmount ? (
              <Text style={[styles.cell, styles.amountCell]} numberOfLines={1}>
                {bucket.amount != null ? formatEuro(bucket.amount) : '—'}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bodyRow: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: withAlpha(t.accent, 0.14) },
  rowEmpty: { opacity: 0.55 },
  headCell: {
    paddingBottom: spacing.xs,
    fontSize: 11,
    fontWeight: '700',
    color: t.textSubtle,
    textTransform: 'uppercase',
  },
  cell: { fontSize: fontSize.sm, color: t.text, fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '700' },
  labelCell: { flex: 1 },
  numCell: { width: 52, textAlign: 'right' },
  amountCell: { width: 84, textAlign: 'right' },
}));
