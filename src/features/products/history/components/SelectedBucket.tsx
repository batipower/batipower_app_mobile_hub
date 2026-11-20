import { Text, View } from 'react-native';

import { formatEuro, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing } from '@/theme';

import type { SalesBucket } from '../salesModel';

/** Détail de la barre sélectionnée d'un histogramme : période, unités, commandes, CA TTC. */
export function SelectedBucket({
  bucket,
  showAmount,
}: {
  bucket: SalesBucket | null;
  showAmount: boolean;
}) {
  const styles = useStyles();
  if (!bucket) {
    return (
      <View style={styles.box}>
        <Text style={styles.hint}>Touchez une barre pour voir le détail de la période.</Text>
      </View>
    );
  }
  return (
    <View style={styles.box} accessible accessibilityLiveRegion="polite">
      <Text style={styles.title}>
        {bucket.fullLabel}
        {bucket.isCurrent ? ' · en cours' : ''}
      </Text>
      <Text style={styles.body}>
        <Text style={styles.strong}>{formatInteger(bucket.quantity)}</Text> unités ·{' '}
        <Text style={styles.strong}>{formatInteger(bucket.ordersCount)}</Text> commandes
        {showAmount && bucket.amount != null ? (
          <>
            {' '}
            · <Text style={styles.strong}>{formatEuro(bucket.amount)}</Text> TTC
          </>
        ) : null}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  title: { fontSize: fontSize.xs, fontWeight: '700', color: t.textSubtle, textTransform: 'capitalize' },
  body: { fontSize: fontSize.sm, color: t.textMuted },
  strong: { fontWeight: '800', color: t.text },
  hint: { fontSize: fontSize.xs, color: t.textFaint },
}));
