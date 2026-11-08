import { Text, View } from 'react-native';

import { SR_CFG } from '@/features/product-analyzer/lib/constants';
import { formatInteger } from '@/lib/format';
import { makeStyles, radius, spacing, withAlpha } from '@/theme';
import type { StockReadiness } from '@/types/hubProductAnalyzer';

/** Disponibilité du stock (entrepôt, agence proche, autre agence, rupture) avec la quantité de l'entrepôt. */
export function StockBadge({
  readiness,
  quantity,
}: {
  readiness: StockReadiness | null | undefined;
  quantity?: number | null;
}) {
  const styles = useStyles();
  if (!readiness) return null;
  const cfg = SR_CFG[readiness];
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(cfg.color, 0.14) }]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.text, { color: cfg.color }]} numberOfLines={1}>
        {cfg.shortLabel}
        {quantity != null && readiness === 'STOCK_OK' ? ` · ${formatInteger(quantity)}` : ''}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10, fontWeight: '700' },
}));
