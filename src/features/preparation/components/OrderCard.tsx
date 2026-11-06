import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Boxes, ChevronRight, MapPin, Package, Truck, Weight } from 'lucide-react-native';

import { colors, fontSize, monoFontFamily, onDark, radius, spacing } from '@/theme';
import type { PreparationOrder } from '@/types/preparation';

import {
  ageLabel,
  cityLine,
  formatWeight,
  getNbColis,
  getTotalPieces,
  getTotalWeight,
  recipientName,
} from '../orderHelpers';
import { OrderTagBadges } from './OrderTagBadges';

function Meta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={styles.meta}>
      {icon}
      <Text style={styles.metaText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const ICON_SIZE = 13;

type OrderCardProps = {
  order: PreparationOrder;
};

/** Carte d'une commande à préparer : référence, âge, badges, client, volumétrie. */
function OrderCardBase({ order }: OrderCardProps) {
  const city = cityLine(order.deliveryAddress);
  const pieces = getTotalPieces(order);
  const colis = getNbColis(order);
  const carrier = order.carrier?.name?.trim();
  const name = recipientName(order.deliveryAddress);
  const age = ageLabel(order.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Commande ${order.reference}, ${name}, il y a ${age}`}
      onPress={() =>
        router.push({
          pathname: '/hub/preparation/[reference]',
          params: { reference: order.reference },
        })
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.reference} numberOfLines={1}>
          {order.reference}
        </Text>
        <Text style={styles.age}>{age}</Text>
        <ChevronRight size={16} color={onDark.textFaint} />
      </View>

      <OrderTagBadges tags={order.warehouseOrder?.tags ?? []} />

      <View style={styles.customer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {city ? (
          <View style={styles.city}>
            <MapPin size={ICON_SIZE} color={onDark.textSubtle} />
            <Text style={styles.cityText} numberOfLines={1}>
              {city}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Meta
          icon={<Package size={ICON_SIZE} color={onDark.textSubtle} />}
          label={`${pieces} pièce${pieces > 1 ? 's' : ''}`}
        />
        <Meta
          icon={<Boxes size={ICON_SIZE} color={onDark.textSubtle} />}
          label={`${colis} colis`}
        />
        <Meta
          icon={<Weight size={ICON_SIZE} color={onDark.textSubtle} />}
          label={formatWeight(getTotalWeight(order))}
        />
        {carrier ? (
          <Meta icon={<Truck size={ICON_SIZE} color={onDark.textSubtle} />} label={carrier} />
        ) : null}
      </View>
    </Pressable>
  );
}

export const OrderCard = memo(OrderCardBase);

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm + 2,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: onDark.border,
    backgroundColor: onDark.surface,
  },
  pressed: { backgroundColor: onDark.surfaceStrong },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  age: { fontSize: fontSize.xs, fontWeight: '600', color: onDark.textMuted },
  customer: { gap: 2 },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white },
  city: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cityText: { flexShrink: 1, fontSize: fontSize.xs, color: onDark.textMuted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 1, maxWidth: 160 },
  metaText: { fontSize: fontSize.xs, color: onDark.textMuted },
});
