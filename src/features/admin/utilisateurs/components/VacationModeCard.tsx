import { Text, View } from 'react-native';
import { Palmtree } from 'lucide-react-native';

import { Card } from '@/components/ui';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { VacationMode } from '@/types/admin';

import { useUserQuickActions, useVacationMode } from '../hooks/useAdminUsers';

/** Mode de visibilité des produits entre acheteurs : manuel (vacances) ou automatique (débridé). */
export function VacationModeCard() {
  const styles = useStyles();
  const t = useTheme();
  const config = useVacationMode();
  const { vacationMode } = useUserQuickActions();
  const mode: VacationMode = config.data?.mode ?? 'MANUAL';

  return (
    <Card contentStyle={styles.content}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Palmtree size={18} color={t.warning} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Mode visibilité produits</Text>
          <Text style={styles.desc}>
            {mode === 'MANUAL'
              ? 'Manuel : les acheteurs se déclarent en vacances individuellement.'
              : 'Automatique : chaque acheteur peut consulter les produits de ses collègues du même service.'}
          </Text>
        </View>
      </View>
      <SegmentedControl<VacationMode>
        segments={[
          { key: 'MANUAL', label: 'Manuel' },
          { key: 'AUTOMATIC', label: 'Automatique' },
        ]}
        value={mode}
        onChange={(next) => {
          if (!vacationMode.isPending) vacationMode.mutate(next);
        }}
      />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: spacing.md },
  top: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  desc: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
}));
