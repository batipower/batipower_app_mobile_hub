import { Text, View } from 'react-native';

import { useBulkTask } from '@/features/product-analyzer/bulkTaskStore';
import { fontSize, makeStyles, radius, shadow, spacing, withAlpha } from '@/theme';

/** Progression d'une action groupée en cours (lancement, EbatPro, DEP…). */
export function BulkProgress() {
  const styles = useStyles();
  const task = useBulkTask();
  if (!task) return null;
  const ratio = task.total > 0 ? Math.min(1, task.done / task.total) : 0;
  return (
    <View style={styles.card} accessibilityRole="progressbar" accessibilityLabel={task.label}>
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>
          {task.label}
        </Text>
        <Text style={styles.count}>
          {task.done}/{task.total}
          {task.errors > 0 ? ` · ${task.errors} en erreur` : ''}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.bgElevated,
    borderWidth: 1,
    borderColor: t.border,
    ...shadow.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  count: { fontSize: fontSize.xs, color: t.textMuted },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: withAlpha(t.accent, 0.18) },
  fill: { height: '100%', borderRadius: 3, backgroundColor: t.accent },
}));
