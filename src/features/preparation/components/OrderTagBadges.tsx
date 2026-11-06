import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, withAlpha } from '@/theme';

import { splitOrderTags } from '../orderHelpers';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

const TONE_COLOR: Record<Tone, string> = {
  green: colors.success,
  amber: colors.warning,
  red: colors.danger,
  blue: colors.info,
  neutral: colors.gray300,
};

function Badge({ label, tone }: { label: string; tone: Tone }) {
  const color = TONE_COLOR[tone];
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.14) }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type OrderTagBadgesProps = {
  tags: string[];
  /** Nombre maximal de tags « libres » affichés (les autres sont résumés en « +N »). */
  maxCustom?: number;
};

/** Badges d'une commande : stock QG, attente livreur, inter-agence, urgences et tags libres. */
export function OrderTagBadges({ tags, maxCustom = 2 }: OrderTagBadgesProps) {
  const { urgent, custom, hasInterAgency, awaitingDriver, stockQg } = splitOrderTags(tags);
  const visibleCustom = custom.slice(0, maxCustom);
  const hidden = custom.length - visibleCustom.length;

  if (!stockQg && !awaitingDriver && !hasInterAgency && urgent.length + custom.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {urgent.map((tag) => (
        <Badge key={tag} label={tag} tone="red" />
      ))}
      {stockQg ? <Badge label="Stock QG" tone="green" /> : null}
      {awaitingDriver ? <Badge label="Attente livreur" tone="amber" /> : null}
      {hasInterAgency ? <Badge label="Inter-agence" tone="blue" /> : null}
      {visibleCustom.map((tag) => (
        <Badge key={tag} label={tag} tone="neutral" />
      ))}
      {hidden > 0 ? <Badge label={`+${hidden}`} tone="neutral" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  badge: {
    maxWidth: 160,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm - 2,
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});
