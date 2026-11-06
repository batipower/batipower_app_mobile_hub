import { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '@/features/preparation/components/ListState';
import { SegmentedControl, type Segment } from '@/features/preparation/components/SegmentedControl';
import { formatDuration, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing } from '@/theme';

import { useSupportResponseTimes } from '../hooks/useCockpitData';
import { Panel, StatGrid, StatTile, SubTitle } from './CockpitPrimitives';

type PeriodKey = '7' | '30' | '90';

const PERIODS: readonly Segment<PeriodKey>[] = [
  { key: '7', label: '7 j' },
  { key: '30', label: '30 j' },
  { key: '90', label: '90 j' },
];

/**
 * Délais de réponse du support du site internet (chat), globaux et par opérateur. Les
 * horaires ouvrés se règlent sur le web (`/super-admin/horaires-support`).
 */
export function SupportResponseCard() {
  const styles = useStyles();
  const [period, setPeriod] = useState<PeriodKey>('30');
  const { data, loading, error } = useSupportResponseTimes(Number(period));

  return (
    <Panel title="Support site internet · délai de réponse">
      <SegmentedControl segments={PERIODS} value={period} onChange={setPeriod} />

      {loading ? (
        <View
          style={styles.skeleton}
          accessibilityLabel="Chargement"
          accessibilityRole="progressbar"
        />
      ) : !data ? (
        <Text style={styles.error} accessibilityRole="alert">
          {errorMessage(error, 'Impossible de charger les délais du support.')}
        </Text>
      ) : (
        <>
          <StatGrid>
            <StatTile label="Délai moyen ouvré" value={formatDuration(data.global.avgWorkingMs)} />
            <StatTile label="Délai moyen brut" value={formatDuration(data.global.avgRawMs)} />
            <StatTile
              label="Réponses"
              value={formatInteger(data.global.responses)}
              hint={`sur ${data.days} jours`}
            />
            <StatTile
              label="En attente"
              value={formatInteger(data.global.pendingConversations)}
              tone={data.global.pendingConversations > 0 ? 'warning' : 'default'}
            />
          </StatGrid>

          {data.operators.length > 0 ? (
            <View style={styles.operators}>
              <SubTitle>Par opérateur</SubTitle>
              {data.operators.map((operator) => (
                <View key={operator.operatorId ?? 'unknown'} style={styles.operator}>
                  <View style={styles.operatorHeader}>
                    <Text style={styles.operatorName} numberOfLines={1}>
                      {operator.operatorName ?? 'Opérateur inconnu'}
                    </Text>
                    <Text style={styles.operatorResponses}>
                      {formatInteger(operator.responses)} réponse{operator.responses > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={styles.operatorMeta}>
                    Ouvré {formatDuration(operator.avgWorkingMs)} (médiane{' '}
                    {formatDuration(operator.medianWorkingMs)}) · brut{' '}
                    {formatDuration(operator.avgRawMs)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Panel>
  );
}

const useStyles = makeStyles((t) => ({
  skeleton: { height: 120, borderRadius: radius.md, backgroundColor: t.surface },
  error: { fontSize: fontSize.sm, color: t.danger },
  operators: { gap: spacing.md },
  operator: { gap: 3, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.surface },
  operatorHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  operatorName: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  operatorResponses: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  operatorMeta: { fontSize: 11, lineHeight: 16, color: t.textSubtle },
}));
