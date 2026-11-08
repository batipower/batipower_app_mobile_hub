import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AlertTriangle, Check, Circle, Clock, Minus, X } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { StepStatus } from '@/types/hubProductAnalyzer';

import type { PipelineView } from '../hooks/useSingleAnalysis';
import { MP_FLAGS, MP_KEYS, STEPS_DEF } from '../lib/constants';
import type { LiveJob } from '../socket/types';

/** Barre de progression fluide (instantanée si « Réduire les animations » est actif). */
export function ProgressBar({ ratio, tone }: { ratio: number; tone?: string }) {
  const styles = useStyles();
  const t = useTheme();
  const reduce = useReduceMotion();
  const value = useSharedValue(ratio);
  useEffect(() => {
    value.value = reduce ? ratio : withTiming(ratio, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [ratio, reduce, value]);
  const animated = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, value.value)) * 100}%` }));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
    >
      <Animated.View style={[styles.fill, { backgroundColor: tone ?? t.accent }, animated]} />
    </View>
  );
}

/** Pastille qui pulse pour l'étape en cours (fixe si « Réduire les animations » est actif). */
function PulseSpinner({ color }: { color: string }) {
  const reduce = useReduceMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduce) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, [reduce, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={animated}>
      <ActivityIndicator size="small" color={color} animating={!reduce} />
    </Animated.View>
  );
}

export function StepIcon({ status }: { status: StepStatus }) {
  const t = useTheme();
  switch (status) {
    case 'running':
      return <PulseSpinner color={t.accent} />;
    case 'done':
      return <Check size={18} color={t.success} />;
    case 'skipped':
      return <Minus size={18} color={t.textFaint} />;
    case 'error':
      return <X size={18} color={t.danger} />;
    case 'warning':
      return <AlertTriangle size={18} color={t.warning} />;
    case 'waiting':
      return <Clock size={18} color={t.warning} />;
    default:
      return <Circle size={14} color={t.textFaint} />;
  }
}

type PipelineCardProps = {
  live: LiveJob;
  pipeline: PipelineView;
  /** Analyse terminée : affiche la progression complète. */
  finished?: boolean;
  /** Affichage compact (file) : seule l'étape en cours + la barre. */
  compact?: boolean;
};

/** Étapes de l'analyse, progression globale, faits saillants et ventes par pays. */
export function PipelineCard({ live, pipeline, finished, compact }: PipelineCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const ratio = finished ? 1 : pipeline.doneCount / pipeline.totalSteps;
  const statusOf = (key: string): StepStatus =>
    key === '4_start' ? pipeline.salesStatus : (live.steps[key]?.status ?? 'idle');
  const labelOf = (key: string, fallback: string) => live.steps[key]?.label || fallback;

  return (
    <View style={styles.card}>
      <View style={styles.progressHead}>
        <Text style={styles.progressText}>
          {pipeline.currentStep ? pipeline.currentStep.aiLabel : finished ? 'Analyse terminée' : 'En attente…'}
        </Text>
        <Text style={styles.progressCount}>
          {pipeline.doneCount}/{pipeline.totalSteps}
        </Text>
      </View>
      <ProgressBar ratio={ratio} />

      {!compact ? (
        <View style={styles.steps}>
          {STEPS_DEF.map((def) => {
            const status = statusOf(def.key);
            const active = status === 'running' || status === 'waiting';
            return (
              <View
                key={def.key}
                style={[styles.step, active && { backgroundColor: withAlpha(t.accent, 0.08) }]}
                accessible
                accessibilityLabel={`${def.label} : ${statusLabel(status)}`}
              >
                <View style={styles.stepIcon}>
                  <StepIcon status={status} />
                </View>
                <View style={styles.stepText}>
                  <Text
                    style={[
                      styles.stepLabel,
                      status === 'idle' && { color: t.textSubtle },
                      status === 'skipped' && { color: t.textFaint },
                      status === 'error' && { color: t.danger },
                    ]}
                  >
                    {labelOf(def.key, def.label)}
                  </Text>
                  {def.key === '4_start' && (status === 'running' || pipeline.salesReceived > 0) ? (
                    <View style={styles.sales}>
                      {MP_KEYS.map((country) => {
                        const entry = live.mpData[country];
                        const countryStatus: StepStatus = entry ? entry.status : 'idle';
                        return (
                          <View key={country} style={styles.country}>
                            <Text style={styles.flag}>{MP_FLAGS[country] ?? country}</Text>
                            <StepIcon status={countryStatus} />
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {pipeline.snippets.length > 0 ? (
        <View style={styles.snippets}>
          {pipeline.snippets.slice(-12).map((snippet) => (
            <View key={snippet} style={styles.snippet}>
              <Text style={styles.snippetText} numberOfLines={1}>
                {snippet}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function statusLabel(status: StepStatus): string {
  switch (status) {
    case 'running':
      return 'en cours';
    case 'done':
      return 'terminée';
    case 'skipped':
      return 'ignorée';
    case 'error':
      return 'en erreur';
    case 'waiting':
      return 'en attente';
    case 'warning':
      return 'avertissement';
    default:
      return 'à venir';
  }
}

/** Chronomètre `m:ss`. */
export function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  progressText: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  progressCount: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: t.surface },
  fill: { height: '100%', borderRadius: 3 },
  steps: { gap: 2 },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  stepIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, gap: spacing.xs },
  stepLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text, paddingTop: 2 },
  sales: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  country: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flag: { fontSize: fontSize.sm },
  snippets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  snippet: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: t.surface,
  },
  snippetText: { fontSize: 11, color: t.textMuted },
}));
