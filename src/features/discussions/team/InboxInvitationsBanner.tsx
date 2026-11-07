import { Pressable, Text, View } from 'react-native';
import { BellRing, ChevronRight } from 'lucide-react-native';

import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

type InboxInvitationsBannerProps = {
  count: number;
  onPress: () => void;
};

/** Bannière des invitations en attente, en tête de la liste Équipe (comme sur le web). */
export function InboxInvitationsBanner({ count, onPress }: InboxInvitationsBannerProps) {
  const styles = useStyles();
  const t = useTheme();
  if (count <= 0) return null;

  const label =
    count === 1 ? 'Une discussion vous attend' : `${count} discussions vous attendent`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Voir les invitations`}
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <BellRing size={20} color={t.warning} />
      <View style={styles.texts}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.subtitle}>
          {count} invitation{count > 1 ? 's' : ''} en attente
        </Text>
      </View>
      <ChevronRight size={18} color={t.warning} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.35),
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  pressed: { opacity: 0.8 },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  subtitle: { fontSize: fontSize.xs, color: t.textMuted },
}));
