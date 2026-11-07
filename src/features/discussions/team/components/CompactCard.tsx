import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { X, type LucideIcon } from 'lucide-react-native';

import { Badge, type BadgeTone } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { thumbnailSource } from '../teamHelpers';

export interface CardPrice {
  label: string;
  value: string;
  /** Met la valeur en avant (prix proposé) ; sinon, valeur neutre. */
  highlight?: boolean;
  /** Valeur absente : encadré en pointillés et texte atténué. */
  empty?: boolean;
}

type CompactCardProps = {
  /** Couleur d'accent du type de carte (vert : opportunité, ambre : renégociation). */
  accent: string;
  /** Icône de remplacement quand la carte n'a pas de miniature. */
  icon: LucideIcon;
  /** Libellé du type de carte, lu par les lecteurs d'écran (« Opportunité », « Renégociation »). */
  kind: string;
  thumbnailBase64?: string | null;
  brand: string | null;
  statusLabel: string;
  statusTone: BadgeTone;
  /** Repère supplémentaire à côté du statut (badge DEP). */
  badge?: ReactNode;
  designation: string | null;
  /** Lignes de repère : référence, EAN, entrepôt. */
  meta: readonly string[];
  prices: readonly CardPrice[];
  /** Aperçu du composer : affiche la croix de retrait. */
  onRemove?: () => void;
  removeLabel?: string;
};

/**
 * Carte compacte d'une opportunité ou d'une renégociation jointe à un message : miniature,
 * marque, statut, désignation, repères et prix figés au moment de l'envoi.
 */
export function CompactCard({
  accent,
  icon: Icon,
  kind,
  thumbnailBase64,
  brand,
  statusLabel,
  statusTone,
  badge,
  designation,
  meta,
  prices,
  onRemove,
  removeLabel = 'Retirer',
}: CompactCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const source = thumbnailSource(thumbnailBase64);

  const summary = [
    kind,
    brand,
    statusLabel,
    designation,
    ...prices.map((p) => `${p.label} ${p.value}`),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      style={[styles.card, { borderColor: withAlpha(accent, 0.4) }]}
      accessible={!onRemove}
      accessibilityLabel={onRemove ? undefined : summary}
    >
      <View style={styles.top}>
        {source ? (
          <Image source={{ uri: source }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: withAlpha(accent, 0.16) }]}>
            <Icon size={16} color={accent} />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            {brand ? (
              <Text style={styles.brand} numberOfLines={1}>
                {brand}
              </Text>
            ) : null}
            <Badge label={statusLabel} tone={statusTone} />
            {badge}
          </View>
          <Text style={styles.designation} numberOfLines={2}>
            {designation || kind}
          </Text>
          {meta.length > 0 ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta.join(' · ')}
            </Text>
          ) : null}
        </View>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={removeLabel}
            hitSlop={12}
            style={styles.remove}
          >
            <X size={14} color={t.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {prices.length > 0 ? (
        <View style={styles.prices}>
          {prices.map((price) => (
            <View
              key={price.label}
              style={[
                styles.price,
                price.empty && styles.priceEmpty,
                price.highlight && !price.empty && { borderColor: withAlpha(accent, 0.5) },
              ]}
            >
              <Text style={styles.priceLabel} numberOfLines={1}>
                {price.label}
              </Text>
              <Text
                style={[
                  styles.priceValue,
                  price.empty && { color: t.textSubtle },
                  price.highlight && !price.empty && { color: t.scheme === 'dark' ? accent : t.text },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {price.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.md - 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: t.card,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  thumb: { width: 40, height: 40, borderRadius: radius.md },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs + 2 },
  brand: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: t.text,
  },
  designation: { fontSize: fontSize.xs, lineHeight: 16, color: t.text },
  meta: { fontSize: 11, color: t.textMuted },
  remove: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surfaceStrong,
  },
  prices: { flexDirection: 'row', gap: spacing.sm },
  price: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  priceEmpty: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  priceLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  priceValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
}));
