import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, StickyNote } from 'lucide-react-native';

import type { HubReturnHistoryItem } from '@/api/hubReturns';
import { Badge } from '@/components/ui';
import { formatDateTime, formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';

import {
  RETURN_TYPE_BADGE,
  packagingOptionFor,
  returnHistoryTarget,
  returnSourceLabel,
  returnStatusLabel,
} from '../constants';

type ReturnCardProps = {
  item: HubReturnHistoryItem;
  onPress: (item: HubReturnHistoryItem) => void;
};

/**
 * Retour dans l'historique : référence, client, n° de suivi (et rang du colis en multi-colis),
 * source, statut, état de l'article et de l'emballage, vérification et remarque manager.
 */
function ReturnCardBase({ item, onPress }: ReturnCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const typeBadge = RETURN_TYPE_BADGE[item.returnType];
  const packaging = packagingOptionFor(item.packagingCondition);
  const target = returnHistoryTarget(item);
  const multiParcel = item.parcelCount != null && item.parcelCount > 1;
  const amount = item.totalPaid != null ? formatEuro(item.totalPaid) : null;
  const verified = item.packageReceivedAndVerified ? formatDateTime(item.dateVerified) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        `Retour ${item.orderReference ?? item.trackingNumber ?? ''}`,
        item.customerName,
        returnStatusLabel(item.status),
        typeBadge.label,
      ]
        .filter(Boolean)
        .join(', ')}
      disabled={!target}
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.reference} numberOfLines={1}>
          {item.orderReference ?? item.trackingNumber ?? '—'}
        </Text>
        {item.managerNote ? <StickyNote size={16} color={t.warning} /> : null}
        {target ? <ChevronRight size={16} color={t.textFaint} /> : null}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {item.customerName ?? 'Client inconnu'}
      </Text>

      {item.trackingNumber ? (
        <Text style={styles.tracking} numberOfLines={1}>
          {item.trackingNumber}
          {multiParcel ? `  ·  colis ${item.parcelIndex}/${item.parcelCount}` : ''}
        </Text>
      ) : null}

      <View style={styles.badges}>
        <Badge label={returnSourceLabel(item.source)} tone="blue" />
        <Badge label={returnStatusLabel(item.status)} tone="neutral" />
        <Badge label={typeBadge.label} tone={typeBadge.tone} />
        {packaging ? <Badge label={packaging.shortLabel} tone={packaging.tone} /> : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta} numberOfLines={1}>
          {[amount, formatDateTime(item.createdAt)].filter(Boolean).join('  ·  ')}
        </Text>
        {verified ? (
          <Text style={styles.verified} numberOfLines={1}>
            Vérifié le {verified}
          </Text>
        ) : null}
      </View>

      {item.managerNote ? (
        <Text style={styles.note} numberOfLines={2}>
          {item.managerNote}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const ReturnCard = memo(ReturnCardBase);

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
  pressed: { backgroundColor: t.cardPressed },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  tracking: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  meta: { flexShrink: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  verified: { flex: 1, textAlign: 'right', fontSize: fontSize.xs, color: t.textSubtle },
  note: {
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.warning,
  },
}));
