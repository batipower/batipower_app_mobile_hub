import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Medal, Trophy, Zap } from 'lucide-react-native';

import { formatDateTime, formatEuro } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import {
  gapVsCompetitor,
  isCaptureStale,
  type BuyboxCompetitorView,
} from '../buyboxDetails';
import type { MarketplaceCountryView } from '../viewModel';

type RowProps = {
  icon: ReactNode;
  label: string;
  seller: string | null;
  priceTTC: number | null;
  shippingCostTTC: number | null;
  deliveryDays: string | null;
  /** Écart de prix TTC avec nous (positif = nous sommes plus chers). */
  gap?: number | null;
};

function CompetitorRow({
  icon,
  label,
  seller,
  priceTTC,
  shippingCostTTC,
  deliveryDays,
  gap,
}: RowProps) {
  const styles = useStyles();
  const t = useTheme();
  const total =
    priceTTC != null && shippingCostTTC != null && shippingCostTTC > 0
      ? priceTTC + shippingCostTTC
      : null;
  const shipping =
    shippingCostTTC == null
      ? null
      : shippingCostTTC > 0
        ? `+ ${formatEuro(shippingCostTTC)} de port`
        : 'port offert';
  const gapColor = gap != null && gap > 0 ? t.danger : t.success;

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
        {seller ? (
          <Text style={styles.seller} numberOfLines={1}>
            {seller}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.price}>{formatEuro(priceTTC)}</Text>
        {shipping ? <Text style={styles.muted}>{shipping}</Text> : null}
        {total != null ? <Text style={styles.total}>= {formatEuro(total)}</Text> : null}
        {deliveryDays ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{deliveryDays}</Text>
          </View>
        ) : null}
        {gap != null && gap !== 0 ? (
          <View style={[styles.chip, { backgroundColor: withAlpha(gapColor, 0.14) }]}>
            <Text style={[styles.chipText, { color: gapColor }]}>
              {gap > 0 ? '+' : ''}
              {formatEuro(gap)} vs 1er
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function fromCompetitor(
  competitor: BuyboxCompetitorView,
): Pick<RowProps, 'seller' | 'priceTTC' | 'shippingCostTTC' | 'deliveryDays'> {
  return {
    seller: competitor.sellerName,
    priceTTC: competitor.priceTTC,
    shippingCostTTC: competitor.shippingCostTTC,
    deliveryDays: competitor.deliveryDays,
  };
}

/**
 * Qui vend : détenteur de la BuyBox quand ce n'est pas nous, premier concurrent avec l'écart de
 * prix, vendeur le plus rapide (Amazon), puis date de la capture (signalée au-delà de 48 h).
 */
export function CompetitionBlock({ view }: { view: MarketplaceCountryView }) {
  const styles = useStyles();
  const t = useTheme();
  const { details } = view;
  const lost = view.isOwner === false && !view.noBuyBox;
  const showHolder = lost && (view.sellerName != null || view.actualPrice != null);
  const gap = view.isOwner ? null : gapVsCompetitor(view.actualPrice, details.firstCompetitor);

  if (!showHolder && !details.firstCompetitor && !details.fastestSeller && !details.capturedAt) {
    return null;
  }

  const stale = isCaptureStale(details.capturedAt);
  const captured = formatDateTime(details.capturedAt);

  return (
    <View style={styles.block}>
      {showHolder ? (
        <CompetitorRow
          icon={<Trophy size={13} color={t.warning} />}
          label="BuyBox"
          seller={view.sellerName}
          priceTTC={view.actualPrice}
          shippingCostTTC={details.shippingCostTTC}
          deliveryDays={details.deliveryDays}
        />
      ) : null}
      {details.firstCompetitor ? (
        <CompetitorRow
          icon={<Medal size={13} color={t.neutral} />}
          label="1er concurrent"
          {...fromCompetitor(details.firstCompetitor)}
          gap={gap}
        />
      ) : null}
      {details.fastestSeller ? (
        <CompetitorRow
          icon={<Zap size={13} color={t.info} />}
          label="Plus rapide"
          {...fromCompetitor(details.fastestSeller)}
        />
      ) : null}
      {captured ? (
        <Text style={[styles.captured, stale && { color: t.warning, fontWeight: '700' }]}>
          {stale ? `Donnée ancienne (plus de 48 h) · capturée le ${captured}` : `Capturée le ${captured}`}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.border,
  },
  row: { gap: spacing.xs },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  seller: { flexShrink: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  rowBody: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  price: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  muted: { fontSize: fontSize.xs, color: t.textSubtle },
  total: { fontSize: fontSize.xs, fontWeight: '700', color: t.text },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: t.surface,
  },
  chipText: { fontSize: 10, fontWeight: '700', color: t.textMuted },
  captured: { fontSize: fontSize.xs, color: t.textFaint },
}));
