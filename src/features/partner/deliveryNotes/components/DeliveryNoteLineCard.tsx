import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MessageSquare } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { formatDate, formatEuro, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { PartnerDeliveryNoteErrorLine } from '@/types/partnerDeliveryNotes';

import { ProductThumb } from '../../shared/ProductThumb';
import { warehouseLabel } from '../../products/constants';
import { formatDiff } from '../constants';

type DeliveryNoteLineCardProps = {
  line: PartnerDeliveryNoteErrorLine;
  onPress: (deliveryNoteUuid: string) => void;
};

/**
 * Ligne de BL en écart : article, prix lu sur le document contre prix attendu, écart, BL parent
 * (entrepôt, date, n° de commande), état « traité » et dernier message.
 */
function DeliveryNoteLineCardBase({ line, onPress }: DeliveryNoteLineCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const treated = !!line.treatedAt;
  const blLabel = line.deliveryNoteReference ?? line.numOrderEbat ?? line.deliveryNoteUuid.slice(0, 8);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${line.designation ?? line.ebatRef}, BL ${blLabel}${treated ? ', traité' : ''}`}
      onPress={() => onPress(line.deliveryNoteUuid)}
      style={({ pressed }) => [
        styles.card,
        treated && styles.treated,
        pressed && { backgroundColor: t.cardPressed },
      ]}
    >
      <ProductThumb base64={line.thumbnailBase64} size={52} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.designation} numberOfLines={2}>
            {line.designation ?? 'Sans désignation'}
          </Text>
          <ChevronRight size={16} color={t.textFaint} />
        </View>
        <Text style={styles.ref} numberOfLines={1}>
          {line.ebatRef}
          {line.brand ? `  ·  ${line.brand}` : ''}
        </Text>

        <View style={styles.prices}>
          <Price label="Lu sur le BL" value={formatEuro(line.priceRead)} />
          <Price label="Attendu" value={formatEuro(line.priceExpected)} />
          <Price label="Qté" value={formatInteger(line.quantity)} />
        </View>
        <Text style={[styles.diff, (line.absoluteDiff ?? 0) > 0 && { color: t.danger }]}>
          Écart {formatDiff(line.absoluteDiff, line.percentDiff)}
        </Text>

        <View style={styles.badges}>
          <Badge label={warehouseLabel(line.warehouse)} tone="neutral" />
          <Badge label={`BL ${blLabel}`} tone="blue" />
          {treated ? <Badge label="Traité" tone="green" /> : null}
          {line.forcedResolvedAt ? <Badge label="Résolu" tone="purple" /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {[formatDate(line.deliveryNoteCreatedAt), line.numOrderEbat ? `Commande ${line.numOrderEbat}` : null]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>

        {line.messagesCount > 0 ? (
          <View style={styles.message}>
            <MessageSquare size={13} color={t.textMuted} />
            <Text style={styles.messageText} numberOfLines={1}>
              {line.lastMessageContent
                ? `${line.lastMessageAuthorName ?? 'Message'} : ${line.lastMessageContent}`
                : `${line.messagesCount} message${line.messagesCount > 1 ? 's' : ''}`}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Price({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.price}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value}</Text>
    </View>
  );
}

export const DeliveryNoteLineCard = memo(DeliveryNoteLineCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  treated: { opacity: 0.7 },
  body: { flex: 1, gap: spacing.xs + 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  designation: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  ref: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
  prices: { flexDirection: 'row', gap: spacing.xl },
  price: { gap: 1 },
  priceLabel: { fontSize: 10.5, fontWeight: '600', color: t.textSubtle },
  priceValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  diff: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  meta: { fontSize: fontSize.xs, color: t.textSubtle },
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  messageText: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
}));
