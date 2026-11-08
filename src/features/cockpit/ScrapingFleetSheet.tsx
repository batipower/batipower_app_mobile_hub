import { ActivityIndicator, Text, View } from 'react-native';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { formatInteger, formatRelative } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { useScrapingFleetTarget } from './hooks/useCockpitData';
import { scrapingFleetTone, type ScrapingFleetTone } from './scrapingFleet';

/**
 * Feuille « Flotte de scrapers » ouverte depuis la pastille du cockpit : pour chaque pays, les
 * bots en route face au nombre nécessaire (rouge sous 2, orange sous l'optimal, vert à l'optimal).
 */
export function ScrapingFleetSheet() {
  const styles = useStyles();
  const t = useTheme();
  const query = useScrapingFleetTarget();
  const data = query.isError || query.data?.status === 'error' ? null : query.data;

  const toneColor: Record<ScrapingFleetTone, string> = {
    ok: t.success,
    warning: t.warning,
    alert: t.danger,
  };

  return (
    <SheetScreen title="Flotte de scrapers" closeLabel="Fermer">
      {query.isPending ? (
        <ActivityIndicator color={t.accentText} />
      ) : !data ? (
        <Text style={styles.muted}>Cible de la flotte indisponible pour le moment.</Text>
      ) : (
        <>
          <View style={styles.total}>
            <Text style={styles.totalValue}>
              {data.totalRunning}/{data.totalOptimal}
            </Text>
            <Text style={styles.muted}>bots en route sur le nombre nécessaire</Text>
          </View>

          <View style={styles.list}>
            {data.pools.map((pool) => {
              const color = toneColor[scrapingFleetTone(pool.running, pool.optimal, pool.running)];
              return (
                <View
                  key={pool.country}
                  accessible
                  accessibilityLabel={`${pool.country} : ${pool.running} en route sur ${pool.optimal} nécessaire${pool.optimal > 1 ? 's' : ''}, ${formatInteger(pool.demandPerDay)} URL par jour${pool.paused > 0 ? `, ${pool.paused} en pause` : ''}`}
                  style={[
                    styles.row,
                    { borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.1) },
                  ]}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.country}>{pool.country}</Text>
                    <Text style={styles.meta}>
                      {formatInteger(pool.demandPerDay)} URL/jour
                      {pool.paused > 0 ? ` · ${pool.paused} en pause` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.count, { color }]}>
                    {pool.running}/{pool.optimal}
                  </Text>
                </View>
              );
            })}
          </View>

          {data.unspecializedAgents > 0 ? (
            <Text style={styles.muted}>
              {data.unspecializedAgents} bot{data.unspecializedAgents > 1 ? 's' : ''} sans pays
              défini, compté{data.unspecializedAgents > 1 ? 's' : ''} dans FR.
            </Text>
          ) : null}

          <Text style={styles.footnote}>
            Nécessaire = demande médiane des {data.windowDays} derniers jours ÷ (
            {formatInteger(data.perAgentDailyThroughput)} URL/jour par bot ×{' '}
            {Math.round(data.targetUtilization * 100)} %)
            {data.usedFallbackThroughput ? ', débit estimé faute d\u2019historique' : ''}. Calculé{' '}
            {formatRelative(data.computedAt) ?? 'à l\u2019instant'}.
          </Text>
        </>
      )}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  total: { alignItems: 'center', gap: spacing.xs },
  totalValue: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: t.text,
    fontVariant: ['tabular-nums'],
  },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  rowMain: { flex: 1, gap: 2 },
  country: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  meta: { fontSize: fontSize.xs, color: t.textMuted },
  count: { fontSize: fontSize.xl, fontWeight: '800', fontVariant: ['tabular-nums'] },
  muted: { fontSize: fontSize.sm, color: t.textMuted, textAlign: 'center' },
  footnote: { fontSize: fontSize.xs, color: t.textSubtle },
}));
