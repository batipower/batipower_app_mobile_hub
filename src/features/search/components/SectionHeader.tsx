import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { makeStyles, radius, spacing, typography, withAlpha } from '@/theme';

type SectionHeaderProps = {
  title: string;
  /** Compteur affiché dans une pastille ; omis quand il ne serait pas exact. */
  count?: number;
  /** Action à droite (ex. « Effacer »). */
  trailing?: ReactNode;
};

/** En-tête d'une section de résultats, sur fond opaque pour passer proprement sous le défilement. */
export function SectionHeader({ title, count, trailing }: SectionHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {count !== undefined ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: t.bg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.label, color: t.textSubtle },
  count: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: withAlpha(t.accent, 0.2),
  },
  countText: { fontSize: 11, fontWeight: '700', color: t.accentText },
}));
