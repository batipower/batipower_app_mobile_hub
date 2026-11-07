import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'neutral';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

/** Pastille d'état (statut, origine, tag…) : texte coloré sur fond teinté. */
export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const styles = useStyles();
  const t = useTheme();
  const color = {
    green: t.success,
    amber: t.warning,
    red: t.danger,
    blue: t.info,
    purple: t.purple,
    neutral: t.neutral,
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.14) }, style]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: {
    alignSelf: 'flex-start',
    maxWidth: 200,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  text: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4 },
}));
