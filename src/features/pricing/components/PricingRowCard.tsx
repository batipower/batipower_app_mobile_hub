import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Eye, Package, Star } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { thumbnailUri } from '@/features/products/productDisplay';
import { formatEuro, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';
import type { HubPricingRow, PricingMarketplaceKey } from '@/types/hubPricing';

import { MARKETPLACE_LABELS, visibleMarketplaces } from '../options';
import { isMonitoredForCountry, parseNumericActual, websiteMargin } from '../rowMetrics';

type PricingRowCardProps = {
  row: HubPricingRow;
  country: string;
  onPress: (row: HubPricingRow) => void;
};

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const styles = useStyles();
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[styles.metricValue, tone === 'good' && styles.good, tone === 'bad' && styles.bad]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function MarketplaceLine({
  row,
  marketplace,
}: {
  row: HubPricingRow;
  marketplace: PricingMarketplaceKey;
}) {
  const styles = useStyles();
  const mp = row.marketplaces[marketplace];
  const actual = parseNumericActual(mp.actual);
  const status = mp.isOwner === true ? 'won' : mp.isOwner === false ? 'lost' : 'unknown';

  return (
    <View style={styles.mpLine}>
      <Text style={styles.mpName} numberOfLines={1}>
        {MARKETPLACE_LABELS[marketplace].short}
      </Text>
      <Text
        style={[
          styles.mpValue,
          actual != null && status === 'won' && styles.good,
          actual != null && status === 'lost' && styles.bad,
        ]}
      >
        {mp.notAvailable ? 'Indispo.' : actual != null ? formatEuro(actual) : '—'}
      </Text>
      <Text style={styles.mpTarget}>
        {mp.targetPrice != null ? `cible ${formatEuro(mp.targetPrice)}` : 'sans cible'}
      </Text>
    </View>
  );
}

/**
 * Ligne du catalogue Pricing : identité, stocks, potentiel, prix d'achat, prix du site avec
 * sa marge, et BuyBox / prix cible de chaque marketplace affichée pour le pays choisi.
 */
function PricingRowCardBase({ row, country, onPress }: PricingRowCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const uri = thumbnailUri(row.thumbnailBase64);
  const margin = websiteMargin(row, country);
  const monitored = isMonitoredForCountry(row, country);
  const markets = visibleMarketplaces(country);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.reference}, ${row.designation ?? 'sans désignation'}`}
      onPress={() => onPress(row)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.thumbnail} accessibilityElementsHidden importantForAccessibility="no">
          {uri ? (
            <Image
              source={{ uri }}
              contentFit="contain"
              style={styles.image}
              recyclingKey={row.reference}
            />
          ) : (
            <Package size={22} color={t.textFaint} />
          )}
        </View>
        <View style={styles.identity}>
          <View style={styles.refRow}>
            <Text style={styles.reference} numberOfLines={1}>
              {row.reference}
            </Text>
            {row.favorite ? <Star size={14} color={t.warning} fill={t.warning} /> : null}
            {monitored ? <Eye size={14} color={t.accentText} /> : null}
          </View>
          <Text style={styles.designation} numberOfLines={2}>
            {[row.brand, row.designation?.trim() || 'Sans désignation'].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <ChevronRight size={16} color={t.textFaint} />
      </View>

      <View style={styles.badges}>
        {row.obsoletProduct ? <Badge label="Obsolète" tone="red" /> : null}
        {row.websiteActive === false ? <Badge label="Hors site" tone="amber" /> : null}
        {row.tooFragile ? <Badge label="Fragile" tone="amber" /> : null}
        {row.hasActiveSupplierOrder ? <Badge label="Cde fournisseur" tone="blue" /> : null}
        {row.productTags.slice(0, 3).map((tag) => (
          <Badge key={tag} label={tag} tone="purple" />
        ))}
        {row.productTags.length > 3 ? (
          <Badge label={`+${row.productTags.length - 3}`} tone="purple" />
        ) : null}
      </View>

      <View style={styles.metrics}>
        <Metric
          label="Stock F / D / QG"
          value={`${formatInteger(row.stock.flevy)} / ${formatInteger(row.stock.dombasle)} / ${formatInteger(row.stock.qg ?? 0)}`}
        />
        <Metric
          label="Potentiel / mois"
          value={
            row.potential.previSalesByMonth != null
              ? formatInteger(row.potential.previSalesByMonth)
              : '—'
          }
        />
        <Metric label="Prix achat HT" value={formatEuro(row.fixPriceHT)} />
        <Metric
          label="Site TTC"
          value={
            row.website.priceTTC != null
              ? margin
                ? `${formatEuro(row.website.priceTTC)} · ${formatPercent(margin.marginPercent, 0)}`
                : formatEuro(row.website.priceTTC)
              : '—'
          }
          tone={margin ? (margin.marginEur >= 0 ? 'good' : 'bad') : undefined}
        />
      </View>

      <View style={styles.markets}>
        {markets.map((marketplace) => (
          <MarketplaceLine key={marketplace} row={row} marketplace={marketplace} />
        ))}
      </View>
    </Pressable>
  );
}

export const PricingRowCard = memo(PricingRowCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  pressed: { backgroundColor: t.cardPressed },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: t.surface,
  },
  image: { width: '100%', height: '100%' },
  identity: { flex: 1, gap: 2 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  reference: {
    flexShrink: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
  },
  designation: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, columnGap: spacing.md },
  metric: { minWidth: '45%', flexGrow: 1, gap: 1 },
  metricLabel: { fontSize: 11, fontWeight: '600', color: t.textSubtle },
  metricValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  good: { color: t.success },
  bad: { color: t.danger },
  markets: {
    gap: spacing.xs + 2,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
  mpLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mpName: { width: 76, fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  mpValue: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  mpTarget: { fontSize: fontSize.xs, color: t.textSubtle },
}));
