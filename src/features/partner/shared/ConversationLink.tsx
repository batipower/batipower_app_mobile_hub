import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MessageSquare } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { fontSize, makeStyles, radius, shadow, spacing, useTheme } from '@/theme';

type ConversationLinkProps = {
  title?: string;
  /** Nombre de messages du fil ; 0 ou absent : « Aucun message ». */
  count?: number;
  /** Une réponse du compte connecté est attendue. */
  awaitingReply?: boolean;
  /** Dernier message, en aperçu. */
  preview?: string | null;
  onPress: () => void;
};

/** Carte « Messages » d'une fiche : ouvre le fil de discussion lié à l'objet affiché. */
export function ConversationLink({
  title = 'Messages',
  count = 0,
  awaitingReply = false,
  preview,
  onPress,
}: ConversationLinkProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count > 0 ? `${count} message${count > 1 ? 's' : ''}` : 'aucun message'}${awaitingReply ? ', réponse attendue' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: t.cardPressed }]}
    >
      <View style={styles.icon}>
        <MessageSquare size={18} color={t.accentText} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {awaitingReply ? <Badge label="Réponse attendue" tone="amber" /> : null}
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {count > 0
            ? `${count} message${count > 1 ? 's' : ''}${preview ? ` · ${preview}` : ''}`
            : 'Aucun message pour le moment'}
        </Text>
      </View>
      <ChevronRight size={16} color={t.textFaint} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: t.surface,
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  preview: { fontSize: fontSize.xs, color: t.textMuted },
}));
