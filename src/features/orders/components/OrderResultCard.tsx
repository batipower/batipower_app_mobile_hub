import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MapPin } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { formatDate, formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';
import type { OrderSearchHit } from '@/types/order';

import {
  customerLocation,
  customerName,
  matchedFieldLabels,
  orderStatusTone,
  originLabel,
  originTone,
} from '../orderDisplay';
import { OriginLogo } from './OriginLogo';

type OrderResultCardProps = {
  order: OrderSearchHit;
  onPress: (order: OrderSearchHit) => void;
};

/**
 * Commande dans une liste de résultats : référence, origine, client, statut, montant,
 * et ce qui a fait remonter la commande (téléphone, n° de suivi, produit…).
 */
function OrderResultCardBase({ order, onPress }: OrderResultCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const name = customerName(order.customer);
  const location = customerLocation(order.customer);
  const date = formatDate(order.createdAt);
  const matched = matchedFieldLabels(order.matchedOn);
  const amount = order.totalPaid != null ? formatEuro(order.totalPaid) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        `Commande ${order.reference}`,
        name,
        order.status,
        amount,
        order.containsProduct ? 'contient le produit recherché' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={() => onPress(order)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.reference} numberOfLines={1}>
          {order.reference}
        </Text>
        {order.origin ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <OriginLogo origin={order.origin} size={20} />
            <Badge label={originLabel(order.origin)} tone={originTone(order.origin)} />
          </View>
        ) : null}
        <ChevronRight size={16} color={t.textFaint} />
      </View>

      <View style={styles.customer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {location ? (
          <View style={styles.location}>
            <MapPin size={13} color={t.textSubtle} />
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.badges}>
        {order.status ? <Badge label={order.status} tone={orderStatusTone(order.status)} /> : null}
        {order.containsProduct ? <Badge label="Contient le produit" tone="purple" /> : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta} numberOfLines={1}>
          {[amount, date].filter(Boolean).join('  ·  ')}
        </Text>
        {matched.length > 0 ? (
          <Text style={styles.matched} numberOfLines={1}>
            Via {matched.join(', ').toLowerCase()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const OrderResultCard = memo(OrderResultCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  pressed: { backgroundColor: t.cardPressed },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  customer: { gap: 2 },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  locationText: { flexShrink: 1, fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  meta: { flexShrink: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  matched: { flex: 1, textAlign: 'right', fontSize: fontSize.xs, color: t.textSubtle },
}));
