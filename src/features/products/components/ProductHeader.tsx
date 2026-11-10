import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Copy, Package } from 'lucide-react-native';

import { Badge, DetailSection, Divider, InfoRow } from '@/components/ui';
import { humanizeCode } from '@/features/orders/orderDisplay';
import { formatWeight } from '@/features/preparation/orderHelpers';
import { copyToClipboard } from '@/lib/clipboard';
import { formatInteger } from '@/lib/format';
import { colors, fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';
import type { HubProductHeader } from '@/types/product';

import { flagBadges, thumbnailUri } from '../productDisplay';

const THUMBNAIL_SIZE = 84;

/** Identité du produit : vignette, référence, désignation, marque, codes, drapeaux et ventes. */
export function ProductHeader({ header }: { header: HubProductHeader }) {
  const styles = useStyles();
  const t = useTheme();
  const uri = thumbnailUri(header.thumbnailBase64);
  const sales = header.salesQuantities;
  const weight = header.weightInGrams ?? 0;

  return (
    <DetailSection title="Produit">
      <View style={styles.identity}>
        <View style={styles.thumbnail} accessibilityElementsHidden importantForAccessibility="no">
          {uri ? (
            <Image
              source={{ uri }}
              contentFit="contain"
              style={styles.image}
              transition={150}
              recyclingKey={header.reference}
            />
          ) : (
            <Package size={28} color={t.textFaint} />
          )}
        </View>

        <View style={styles.identityBody}>
          <Pressable
            onPress={() => void copyToClipboard(header.reference, 'Référence')}
            accessibilityRole="button"
            accessibilityLabel={`Référence ${header.reference}`}
            accessibilityHint="Appuyer pour copier"
            hitSlop={12}
            style={styles.referenceRow}
          >
            <Text style={styles.reference}>{header.reference}</Text>
            <Copy size={14} color={t.textSubtle} />
          </Pressable>
          <Text style={styles.designation}>{header.designation?.trim() || 'Sans désignation'}</Text>
          {header.brand ? <Text style={styles.brand}>{header.brand}</Text> : null}
        </View>
      </View>

      <View style={styles.badges}>
        {flagBadges(header.flags).map((badge) => (
          <Badge key={badge.label} label={badge.label} tone={badge.tone} />
        ))}
      </View>

      <Divider />
      {header.ean ? <InfoRow label="EAN" value={header.ean} mono copyLabel="EAN" /> : null}
      {header.codeFlevy ? (
        <InfoRow label="Code Flevy" value={header.codeFlevy} mono copyLabel="Code Flevy" />
      ) : null}
      {header.codeDombasle ? (
        <InfoRow label="Code Dombasle" value={header.codeDombasle} mono copyLabel="Code Dombasle" />
      ) : null}
      {header.codeLille ? (
        <InfoRow label="Code Lille" value={header.codeLille} mono copyLabel="Code Lille" />
      ) : null}
      {header.categoryType ? (
        <InfoRow label="Catégorie" value={humanizeCode(header.categoryType)} />
      ) : null}
      {weight > 0 ? <InfoRow label="Poids" value={formatWeight(weight)} /> : null}

      {sales ? (
        <>
          <Divider />
          <Text style={styles.salesTitle}>Ventes (unités)</Text>
          <View style={styles.sales}>
            <SalesTile label="7 jours" value={sales.last7Days} />
            <SalesTile label="30 jours" value={sales.last30Days} />
            <SalesTile label="Total" value={sales.totalQuantity} />
          </View>
        </>
      ) : null}
    </DetailSection>
  );
}

function SalesTile({ label, value }: { label: string; value: number | undefined }) {
  const styles = useStyles();
  return (
    <View
      style={styles.salesTile}
      accessible
      accessibilityLabel={`Ventes ${label} : ${value == null ? 'inconnues' : formatInteger(value)} unités`}
    >
      <Text style={styles.salesValue}>{formatInteger(value)}</Text>
      <Text style={styles.salesLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  identity: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.borderStrong,
    backgroundColor: colors.white,
  },
  image: { width: '100%', height: '100%' },
  identityBody: { flex: 1, gap: spacing.xs },
  referenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flexShrink: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.accentText,
  },
  designation: { fontSize: fontSize.sm, lineHeight: 20, fontWeight: '600', color: t.text },
  brand: { fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  salesTitle: { fontSize: fontSize.sm, color: t.textMuted },
  sales: { flexDirection: 'row', gap: spacing.sm },
  salesTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  salesValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: t.text,
    fontVariant: ['tabular-nums'],
  },
  salesLabel: { fontSize: 11, color: t.textSubtle },
}));
