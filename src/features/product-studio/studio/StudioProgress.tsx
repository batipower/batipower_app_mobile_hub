import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { STEPS } from '../domain/model';
import { ProgressBar } from './ui';

type Props = {
  steps: Record<string, string>;
  title: string;
  subtitle?: string;
  /** Étapes affichées (par défaut, les étapes de préparation). */
  stepDefs?: readonly { key: string; label: string }[];
  /** Position dans la file (1 = prochain) : remplace les étapes tant que le job n'a pas démarré. */
  queuePosition?: number | null;
  /** Quitter l'écran en laissant le job tourner (une notification prévient à la fin). */
  onBackground?: () => void;
};

/** Étapes d'un job du Studio (préparation ou déploiement) avec jauge globale. */
export function StudioProgress({
  steps,
  title,
  subtitle,
  stepDefs = STEPS,
  queuePosition,
  onBackground,
}: Props) {
  const styles = useStyles();
  const t = useTheme();
  const queued = typeof queuePosition === 'number' && queuePosition > 0;
  const doneCount = stepDefs.filter(
    (s) => steps[s.key] === 'done' || steps[s.key] === 'skipped',
  ).length;
  const running = stepDefs.find((s) => steps[s.key] === 'running');
  const known = stepDefs.some((s) => steps[s.key] && steps[s.key] !== 'waiting');
  const percent = known ? Math.round((doneCount / stepDefs.length) * 100) : 12;

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={t.accent} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {queued
          ? `En file d'attente : position ${queuePosition}`
          : (running?.label ?? subtitle ?? 'Chargement…')}
      </Text>
      {!queued ? (
        <View style={styles.bar}>
          <ProgressBar value={Math.max(percent, 8)} />
          {known ? (
            <Text style={styles.count}>
              {doneCount}/{stepDefs.length} étapes
            </Text>
          ) : null}
        </View>
      ) : null}
      {!queued && known ? (
        <View style={styles.list}>
          {stepDefs.map((step) => {
            const status = steps[step.key];
            const color =
              status === 'done' || status === 'skipped'
                ? t.accent
                : status === 'running'
                  ? t.info
                  : status === 'error'
                    ? t.danger
                    : t.borderStrong;
            return (
              <View key={step.key} style={styles.item}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text
                  style={[
                    styles.itemText,
                    status === 'running' && { color: t.text, fontWeight: '700' },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {onBackground ? (
        <View style={styles.background}>
          <Button label="Passer en arrière-plan" variant="outline" onPress={onBackground} />
          <Text style={styles.hint}>Le traitement continue : vous serez notifié à la fin.</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { alignItems: 'center', gap: spacing.sm, padding: spacing['2xl'], paddingTop: spacing['4xl'] },
  title: { fontSize: fontSize.base, fontWeight: '800', color: t.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: t.textMuted, textAlign: 'center' },
  bar: { alignSelf: 'stretch', gap: 4, marginTop: spacing.sm },
  count: { fontSize: 11, color: t.textSubtle, textAlign: 'center' },
  list: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: t.surface,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  itemText: { fontSize: fontSize.xs, color: t.textMuted },
  background: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.lg },
  hint: { fontSize: 11, color: t.textSubtle, textAlign: 'center' },
}));
