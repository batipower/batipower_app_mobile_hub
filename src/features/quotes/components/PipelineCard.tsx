import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, FileText, Inbox } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { formatEuro, formatRelative } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';

import { itemStatusMeta, type PipelineItem } from '../pipeline';

type PipelineCardProps = {
  item: PipelineItem;
  onPress: (item: PipelineItem) => void;
};

/** Carte du pipeline : une demande de devis ou un devis, avec son statut et ses montants. */
function PipelineCardBase({ item, onPress }: PipelineCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const status = itemStatusMeta(item);
  const isRequest = item.kind === 'DEMANDE';
  const Icon = isRequest ? Inbox : FileText;
  const date = formatRelative(item.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isRequest ? 'Demande' : 'Devis'} ${item.reference ?? ''}, ${item.customerLabel}, ${status.label}`}
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Icon size={18} color={t.accentText} />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.reference} numberOfLines={1}>
            {item.reference ?? (isRequest ? 'Demande' : 'Devis')}
          </Text>
          <Badge label={status.label} tone={status.tone} />
        </View>
        <Text style={styles.customer} numberOfLines={1}>
          {item.customerLabel}
        </Text>
        {item.customerSub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {item.customerSub}
          </Text>
        ) : null}
        <View style={styles.bottomRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {[
              date,
              isRequest
                ? `${item.productCount ?? 0} produit${(item.productCount ?? 0) > 1 ? 's' : ''}`
                : null,
              item.customerKind === 'PS' ? 'Client PS' : item.customerKind === 'PROSPECT' ? 'Prospect' : null,
              item.ebatNumber ? `eBAT ${item.ebatNumber}` : null,
              item.prestashopOrderRef ? `Cmd ${item.prestashopOrderRef}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {!isRequest ? (
            <View style={styles.amounts}>
              <Text style={styles.total}>{formatEuro(item.totalTTC)}</Text>
              {item.marginPct != null ? (
                <Text style={[styles.margin, { color: item.marginPct < 0 ? t.danger : t.success }]}>
                  {`${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(item.marginPct)} %`}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight size={16} color={t.textSubtle} />
    </Pressable>
  );
}

export const PipelineCard = memo(PipelineCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  pressed: { backgroundColor: t.cardPressed },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  body: { flex: 1, gap: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  reference: { flex: 1, fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted, fontFamily: monoFontFamily },
  customer: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
  meta: { flex: 1, fontSize: 11, color: t.textSubtle },
  amounts: { alignItems: 'flex-end' },
  total: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  margin: { fontSize: 11, fontWeight: '600' },
}));
