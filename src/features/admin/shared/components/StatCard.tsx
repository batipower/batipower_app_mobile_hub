import { Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

type StatCardProps = {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

/** Indicateur chiffré (libellé en petites capitales, valeur en gros). */
export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const color = { default: t.text, success: t.success, warning: t.warning, danger: t.danger }[tone];
  return (
    <Card style={styles.card} contentStyle={styles.content}>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.value, { color }]} accessibilityLabel={`${label} : ${value}`}>
        {value}
      </Text>
    </Card>
  );
}

/** Rangée de cartes d'indicateurs qui se répartissent la largeur. */
export function StatRow({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.row}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { flexGrow: 1, flexBasis: '30%', minWidth: 100 },
  content: { padding: spacing.md, gap: spacing.xs },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: t.textSubtle },
  value: { fontSize: fontSize.xl, fontWeight: '800' },
}));
