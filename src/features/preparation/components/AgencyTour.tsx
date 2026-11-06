import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { colors, fontSize, monoFontFamily, onDark, radius, spacing, withAlpha } from '@/theme';
import type { DriverTourAgency, DriverTourItem } from '@/types/preparation';

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count > 1 ? pluralForm : singular}`;

type AgencySectionHeaderProps = {
  agency: DriverTourAgency;
};

/** En-tête d'une agence : nom et totaux (commandes, références, pièces). */
export function AgencySectionHeader({ agency }: AgencySectionHeaderProps) {
  return (
    <View style={styles.header} accessibilityRole="header">
      <View style={styles.headerIcon}>
        <MapPin size={16} color={colors.warning} />
      </View>
      <View style={styles.headerBody}>
        <Text style={styles.agencyName} numberOfLines={1}>
          {agency.agencyName}
        </Text>
        <Text style={styles.agencyTotals}>
          {plural(agency.totalOrders, 'commande')} · {plural(agency.totalReferences, 'réf.')} ·{' '}
          {plural(agency.totalPieces, 'pièce')}
        </Text>
      </View>
    </View>
  );
}

type AgencyItemRowProps = {
  item: DriverTourItem;
  last: boolean;
};

/** Ligne d'article à récupérer : quantité, référence produit, désignation. */
function AgencyItemRowBase({ item, last }: AgencyItemRowProps) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.quantity}>{item.quantity}×</Text>
      <View style={styles.rowBody}>
        <Text style={styles.reference} numberOfLines={1}>
          {item.reference}
        </Text>
        {item.productName ? (
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const AgencyItemRow = memo(AgencyItemRowBase);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: 0,
    borderColor: onDark.border,
    backgroundColor: onDark.surfaceStrong,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.warning, 0.14),
  },
  headerBody: { flex: 1, gap: 2 },
  agencyName: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  agencyTotals: { fontSize: fontSize.xs, fontWeight: '600', color: colors.warning },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    borderRightWidth: StyleSheet.hairlineWidth * 2,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderColor: onDark.border,
    backgroundColor: onDark.surface,
  },
  rowLast: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  quantity: {
    minWidth: 40,
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  rowBody: { flex: 1, gap: 2 },
  reference: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.green,
  },
  productName: { fontSize: fontSize.xs, lineHeight: 17, color: onDark.textMuted },
});
