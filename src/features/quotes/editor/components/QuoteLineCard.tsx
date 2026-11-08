import { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { AlertTriangle, ChevronRight, Package } from 'lucide-react-native';

import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';

import type { LineRow } from '../../lib/line-types';
import { lineTotalTTC } from '../../lib/quote-math';

type QuoteLineCardProps = {
  line: LineRow;
  onPress: (key: string) => void;
  /** Ligne à 0 € ou hors périmètre GLS : mise en évidence. */
  warning?: string;
};

/** Ligne du devis : produit (référence, quantité, prix client, total TTC), titre ou texte libre. */
function QuoteLineCardBase({ line, onPress, warning }: QuoteLineCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const type = line.lineType ?? 'product';

  if (type !== 'product') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${type === 'title' ? 'Titre' : 'Texte'} : ${line.content ?? ''}`}
        onPress={() => onPress(line.key)}
        style={({ pressed }) => [styles.textRow, pressed && styles.pressed]}
      >
        <Text
          style={[styles.textContent, type === 'title' && styles.titleContent]}
          numberOfLines={3}
        >
          {line.content?.trim() || (type === 'title' ? 'Titre de section' : 'Texte libre')}
        </Text>
        <ChevronRight size={16} color={t.textSubtle} />
      </Pressable>
    );
  }

  const unitTTC = line.unitPriceHT * (1 + line.taxRate);
  const total = lineTotalTTC(line.quantity, line.unitPriceHT, line.taxRate);
  const discounted = line.catalogPriceTTC > 0 && unitTTC < line.catalogPriceTTC - 0.01;
  const label = line.productLabel?.trim() || line.reference;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, quantité ${line.quantity}, total ${formatEuro(total)} TTC`}
      onPress={() => onPress(line.key)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        {line.imageUrl ? (
          <Image source={{ uri: line.imageUrl }} contentFit="contain" style={styles.image} />
        ) : (
          <Package size={18} color={t.textFaint} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.reference} numberOfLines={1}>
          {line.reference}
          {line.active === false ? '  ·  Inactif PS' : ''}
        </Text>
        <View style={styles.priceLine}>
          <Text style={styles.qty}>{line.quantity} ×</Text>
          <Text style={styles.unit}>{formatEuro(unitTTC)}</Text>
          {discounted ? <Text style={styles.strike}>{formatEuro(line.catalogPriceTTC)}</Text> : null}
        </View>
        {warning ? (
          <View style={styles.warning}>
            <AlertTriangle size={12} color={t.danger} />
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.end}>
        {line.loading ? (
          <ActivityIndicator size="small" color={t.accentText} />
        ) : (
          <Text style={styles.total}>{formatEuro(total)}</Text>
        )}
        <Text style={styles.ttc}>TTC</Text>
      </View>
    </Pressable>
  );
}

export const QuoteLineCard = memo(QuoteLineCardBase);

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.6 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: 48, height: 48 },
  body: { flex: 1, gap: 2 },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  reference: { fontSize: fontSize.xs, color: t.textMuted, fontFamily: monoFontFamily },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs + 2, marginTop: 2 },
  qty: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  unit: { fontSize: fontSize.xs, fontWeight: '600', color: t.text },
  strike: { fontSize: fontSize.xs, color: t.textSubtle, textDecorationLine: 'line-through' },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: withAlpha(t.danger, 0.1),
  },
  warningText: { fontSize: fontSize.xs, fontWeight: '600', color: t.danger },
  end: { alignItems: 'flex-end' },
  total: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  ttc: { fontSize: 10, color: t.textSubtle },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  textContent: { flex: 1, fontSize: fontSize.sm, color: t.textMuted, fontStyle: 'italic' },
  titleContent: {
    fontStyle: 'normal',
    fontWeight: '800',
    color: t.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: fontSize.xs,
  },
}));
