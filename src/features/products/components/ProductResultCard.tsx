import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { productMatchedOnLabel } from '@/features/search/searchHelpers';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { HubProductSearchHit } from '@/types/product';

type ProductResultCardProps = {
  product: HubProductSearchHit;
  onPress: (product: HubProductSearchHit) => void;
};

/** Fiche produit dans une liste de résultats : référence, désignation, marque, champ trouvé. */
function ProductResultCardBase({ product, onPress }: ProductResultCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const matched = productMatchedOnLabel(product.matchedOn);
  const details = [product.brand, `Trouvé par : ${matched.toLowerCase()}`]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        `Produit ${product.reference}`,
        product.designation,
        product.brand,
        product.exact ? 'correspondance exacte' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={() => onPress(product)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.reference} numberOfLines={1}>
          {product.reference}
        </Text>
        {product.exact ? <Badge label="Exact" tone="green" /> : null}
        <ChevronRight size={16} color={t.textFaint} />
      </View>
      {product.designation ? (
        <Text style={styles.designation} numberOfLines={2}>
          {product.designation}
        </Text>
      ) : null}
      <Text style={styles.details} numberOfLines={1}>
        {details}
      </Text>
    </Pressable>
  );
}

export const ProductResultCard = memo(ProductResultCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.xs + 2,
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
    color: t.accentText,
  },
  designation: { fontSize: fontSize.sm, lineHeight: 19, color: t.text },
  details: { fontSize: fontSize.xs, color: t.textSubtle },
}));
