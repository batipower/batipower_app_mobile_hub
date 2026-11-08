import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MessageSquare } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { formatDate, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { PartnerDepProduct, PartnerProduct } from '@/types/partnerProducts';

import { ProductThumb } from '../../shared/ProductThumb';
import { CRITICITE_META, formatWeeks, warehouseLabel } from '../constants';

type ProductCardProps = {
  item: PartnerProduct | PartnerDepProduct;
  /** Miniature chargée à part de la liste (le back ne l'embarque pas toujours). */
  thumb: string | null | undefined;
  onPress: (reference: string) => void;
};

function isDep(item: PartnerProduct | PartnerDepProduct): item is PartnerDepProduct {
  return 'depWarehouses' in item;
}

/**
 * Produit dans la liste : miniature, désignation, référence et marque, état du stock
 * (criticité, rupture, réappro à lancer), messages et chiffres clés. La carte DEP montre le
 * stock restant, les entrepôts concernés et la date d'entrée en DEP.
 */
function ProductCardBase({ item, thumb, onPress }: ProductCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const dep = isDep(item);
  const criticite = item.niveauCriticite ? CRITICITE_META[item.niveauCriticite] : null;
  const messages = item.messagesCount ?? 0;
  const waiting = item.awaitingReplyFromMe === true;
  const depSince = dep ? formatDate(item.depSince) : null;

  const stats = dep
    ? [
        `Stock restant ${formatInteger(item.remainingStock)}`,
        item.warehouseDombasleStock != null
          ? `Dombasle ${formatInteger(item.warehouseDombasleStock)}`
          : null,
        item.warehouseFlevyStock != null ? `Flevy ${formatInteger(item.warehouseFlevyStock)}` : null,
      ]
    : [
        `Stock ${formatInteger(item.warehouseDombasleStock)}`,
        `Couv. ${formatWeeks(item.couvertureEnSemaines)}`,
        item.venteMoyenne3mois != null
          ? `Ventes 3 m. ${formatInteger(Math.round(item.venteMoyenne3mois))}`
          : null,
      ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        item.designation ?? item.reference,
        `référence ${item.reference}`,
        criticite?.label,
        waiting ? 'réponse attendue' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={() => onPress(item.reference)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ProductThumb base64={thumb ?? item.thumbnailBase64} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.designation} numberOfLines={2}>
            {item.designation ?? 'Sans désignation'}
          </Text>
          <ChevronRight size={16} color={t.textFaint} />
        </View>
        <Text style={styles.reference} numberOfLines={1}>
          {item.reference}
          {item.brand ? `  ·  ${item.brand}` : ''}
        </Text>

        <View style={styles.badges}>
          {dep ? (
            <>
              {item.depWarehouses.map((warehouse) => (
                <Badge key={warehouse} label={warehouseLabel(warehouse)} tone="blue" />
              ))}
              {depSince ? <Badge label={`DEP depuis ${depSince}`} tone="purple" /> : null}
            </>
          ) : (
            <>
              {criticite && item.niveauCriticite !== 'C' ? (
                <Badge label={criticite.label} tone={criticite.tone} />
              ) : null}
              {item.ruptureNbDays != null && item.ruptureNbDays > 0 ? (
                <Badge label={`Rupture ${item.ruptureNbDays} j`} tone="red" />
              ) : null}
              {item.needsAppro ? <Badge label="Réappro" tone="amber" /> : null}
              {item.aRenegocier ? <Badge label="À renégocier" tone="purple" /> : null}
              {item.obsoletProduct ? <Badge label="Obsolète" tone="neutral" /> : null}
            </>
          )}
        </View>

        <Text style={styles.stats} numberOfLines={1}>
          {stats.filter(Boolean).join('  ·  ')}
        </Text>

        {messages > 0 ? (
          <View style={styles.message}>
            <MessageSquare size={13} color={waiting ? t.warning : t.textMuted} />
            <Text
              style={[styles.messageText, waiting && { color: t.warning }]}
              numberOfLines={1}
            >
              {waiting ? 'Réponse attendue' : `${messages} message${messages > 1 ? 's' : ''}`}
              {item.lastMessagePreview ? ` · ${item.lastMessagePreview}` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardBase);

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
  pressed: { backgroundColor: t.cardPressed },
  body: { flex: 1, gap: spacing.xs + 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  designation: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  reference: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  stats: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  messageText: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
}));
