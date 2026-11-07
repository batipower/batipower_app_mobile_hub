import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { fontSize, makeStyles, radius, spacing, withAlpha } from '@/theme';
import type { ReactionSummaryDto } from '@/types/discussions';

type ReactionPillsProps = {
  messageId: string;
  reactions: readonly ReactionSummaryDto[];
  onToggle: (messageId: string, emoji: string) => void;
};

/** Pastilles emoji + compteur sous un message ; un appui ajoute ou retire sa propre réaction. */
export const ReactionPills = memo(function ReactionPills({
  messageId,
  reactions,
  onToggle,
}: ReactionPillsProps) {
  const styles = useStyles();
  if (reactions.length === 0) return null;

  return (
    <View style={styles.row}>
      {reactions.map((reaction) => {
        const who = reaction.userNames.length > 0 ? ` par ${reaction.userNames.join(', ')}` : '';
        return (
          <Pressable
            key={reaction.emoji}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onToggle(messageId, reaction.emoji);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${reaction.emoji}, ${reaction.count} réaction${reaction.count > 1 ? 's' : ''}${who}${reaction.reactedByMe ? '. La vôtre' : ''}`}
            accessibilityHint={reaction.reactedByMe ? 'Retire votre réaction' : 'Ajoute votre réaction'}
            accessibilityState={{ selected: reaction.reactedByMe }}
            style={[styles.pill, reaction.reactedByMe && styles.pillMine]}
          >
            <Text style={styles.emoji}>{reaction.emoji}</Text>
            <Text style={[styles.count, reaction.reactedByMe && styles.countMine]}>
              {reaction.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: spacing.xs },
  pill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  pillMine: {
    borderColor: withAlpha(t.accent, 0.6),
    backgroundColor: withAlpha(t.accent, 0.16),
  },
  emoji: { fontSize: fontSize.sm },
  count: { fontSize: 12, fontWeight: '700', color: t.textMuted },
  countMine: { color: t.accentText },
}));
