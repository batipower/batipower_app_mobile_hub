import { Pressable, Text } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

type SeeAllLinkProps = {
  label: string;
  onPress: () => void;
};

/** Lien « Voir les N commandes » en bas d'une section tronquée. */
export function SeeAllLink({ label, onPress }: SeeAllLinkProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <ArrowRight size={16} color={t.accentText} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  link: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: withAlpha(t.accent, 0.1),
  },
  pressed: { backgroundColor: withAlpha(t.accent, 0.18) },
  label: { flexShrink: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
}));
