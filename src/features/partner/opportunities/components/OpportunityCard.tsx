import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MessageSquare } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { formatDate, formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { PartnerOpportunity } from '@/types/partnerOpportunities';

import { warehouseLabel } from '../../products/constants';
import { OPPORTUNITY_STATUS_META } from '../constants';

type OpportunityCardProps = {
  item: PartnerOpportunity;
  onPress: (uuid: string) => void;
};

/**
 * Opportunité dans la liste : marque et désignation, statut, état de lecture et de traitement,
 * prix demandé face au prix d'achat actuel, prix proposé ou obtenu, et dernier message.
 */
function OpportunityCardBase({ item, onPress }: OpportunityCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const status = OPPORTUNITY_STATUS_META[item.status];
  const unread = item.status === 'OPEN' && !item.isRead;
  const treated = !!item.treatedAt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        item.brand,
        item.designation ?? item.ean,
        status.label,
        unread ? 'non lue' : null,
        treated ? 'traitée' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={() => onPress(item.uuid)}
      style={({ pressed }) => [
        styles.card,
        treated && styles.treated,
        pressed && { backgroundColor: t.cardPressed },
      ]}
    >
      <View style={styles.header}>
        {unread ? <View style={styles.dot} /> : null}
        <Text style={[styles.brand, unread && styles.bold]} numberOfLines={1}>
          {item.brand ?? 'Marque inconnue'}
        </Text>
        <Text style={styles.date}>{formatDate(item.createdAt) ?? ''}</Text>
        <ChevronRight size={16} color={t.textFaint} />
      </View>

      <Text style={styles.designation} numberOfLines={2}>
        {item.designation ?? 'Sans désignation'}
      </Text>
      {item.ean ? <Text style={styles.ean}>{item.ean}</Text> : null}

      <View style={styles.badges}>
        <Badge label={status.label} tone={status.tone} />
        {item.depWarehouse ? (
          <Badge label={`DEP ${warehouseLabel(item.depWarehouse)}`} tone="blue" />
        ) : null}
        {treated ? <Badge label="Traitée" tone="green" /> : null}
        {item.proposalsCount > 0 ? (
          <Badge
            label={`${item.proposalsCount} proposition${item.proposalsCount > 1 ? 's' : ''}`}
            tone="neutral"
          />
        ) : null}
      </View>

      <View style={styles.prices}>
        <Price label="Demandé" value={formatEuro(item.requestedMinPriceHT)} />
        <Price label="PA actuel" value={formatEuro(item.currentFixPriceHT)} />
        {item.obtainedPriceHT != null ? (
          <Price label="Obtenu" value={formatEuro(item.obtainedPriceHT)} highlight />
        ) : item.proposedPriceHT != null ? (
          <Price label="Proposé" value={formatEuro(item.proposedPriceHT)} highlight />
        ) : null}
      </View>

      {item.messagesCount > 0 ? (
        <View style={styles.message}>
          <MessageSquare size={13} color={t.textMuted} />
          <Text style={styles.messageText} numberOfLines={1}>
            {item.lastMessage
              ? `${item.lastMessage.authorName} : ${item.lastMessage.content}`
              : `${item.messagesCount} message${item.messagesCount > 1 ? 's' : ''}`}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Price({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.price}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, highlight && styles.priceHighlight]}>{value}</Text>
    </View>
  );
}

export const OpportunityCard = memo(OpportunityCardBase);

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
  treated: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: t.accent },
  brand: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.textMuted },
  bold: { color: t.text, fontWeight: '800' },
  date: { fontSize: fontSize.xs, color: t.textSubtle },
  designation: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  ean: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  prices: { flexDirection: 'row', gap: spacing.xl },
  price: { gap: 1 },
  priceLabel: { fontSize: 10.5, fontWeight: '600', color: t.textSubtle },
  priceValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  priceHighlight: { color: t.accentText },
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  messageText: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
}));
