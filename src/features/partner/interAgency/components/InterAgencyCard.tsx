import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { InterAgencyOrder } from '@/types/partnerInterAgency';

import { warehouseLabel } from '../../products/constants';
import { INTER_AGENCY_STATUS_META } from '../constants';
import { ageLabel, daysSince, interAgencyStatus, orderLabel } from '../lib';
import { ConversationBadges } from './ConversationBadges';

type InterAgencyCardProps = {
  order: InterAgencyOrder;
  onPress: (order: InterAgencyOrder) => void;
};

/** Résumé de l'inter-agence conseillée : agences ayant du stock pour chaque référence manquante. */
export function suggestionText(order: InterAgencyOrder): string | null {
  const parts = order.stockDetails.map((detail) => {
    const agencies = detail.otherWarehouseAgencies
      .slice(0, 2)
      .map((agency) => `${agency.name} ${agency.stock}`);
    if (agencies.length > 0) {
      const more = detail.otherWarehouseAgencies.length - agencies.length;
      return `${detail.productRef} → ${agencies.join(', ')}${more > 0 ? ` +${more}` : ''}`;
    }
    return detail.qgStock > 0
      ? `${detail.productRef} → QG ${detail.qgStock}`
      : `${detail.productRef} → aucune agence`;
  });
  return parts.length > 0 ? parts.join('  ·  ') : null;
}

/**
 * Commande inter-agence dans la liste : référence, entrepôt, ancienneté (rouge à partir de 5 j),
 * statut (à traiter, réalisée, impossible) et pré-réception, agences conseillées, acheteurs et
 * fils de discussion.
 */
function InterAgencyCardBase({ order, onPress }: InterAgencyCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const status = INTER_AGENCY_STATUS_META[interAgencyStatus(order)];
  const days = daysSince(order.createdAt);
  const suggestion = suggestionText(order);
  const buyers = order.buyers.map((buyer) => buyer.code || buyer.name).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Commande ${orderLabel(order)}, ${status.label}`}
      onPress={() => onPress(order)}
      style={({ pressed }) => [
        styles.card,
        order.interAgencyImpossible && styles.impossible,
        pressed && { backgroundColor: t.cardPressed },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.reference} numberOfLines={1}>
          {orderLabel(order)}
        </Text>
        <Text style={[styles.age, days >= 5 && styles.ageCritical, days >= 2 && days < 5 && styles.ageOld]}>
          {ageLabel(days)}
        </Text>
        <ChevronRight size={16} color={t.textFaint} />
      </View>

      <View style={styles.badges}>
        <Badge label={status.label} tone={status.tone} />
        {order.interAgencyPreReceived ? <Badge label="Pré-réception" tone="blue" /> : null}
        {order.warehouseAffectation ? (
          <Badge label={warehouseLabel(order.warehouseAffectation)} tone="neutral" />
        ) : null}
        {order.distributorName ? <Badge label={order.distributorName} tone="neutral" /> : null}
        {order.interAgencyImpossible && order.customerNotifiedAt ? (
          <Badge label="Client prévenu" tone="purple" />
        ) : null}
      </View>

      {suggestion ? (
        <Text style={styles.suggestion} numberOfLines={2}>
          {suggestion}
        </Text>
      ) : null}
      {buyers ? (
        <Text style={styles.buyers} numberOfLines={1}>
          Acheteurs : {buyers}
        </Text>
      ) : null}

      <ConversationBadges order={order} />
    </Pressable>
  );
}

export const InterAgencyCard = memo(InterAgencyCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  impossible: { borderColor: t.danger },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  age: { fontSize: fontSize.xs, fontWeight: '600', color: t.textSubtle },
  ageOld: { color: t.warning },
  ageCritical: { color: t.danger, fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  suggestion: { fontSize: fontSize.xs, lineHeight: 17, color: t.success },
  buyers: { fontSize: fontSize.xs, color: t.textMuted },
}));
