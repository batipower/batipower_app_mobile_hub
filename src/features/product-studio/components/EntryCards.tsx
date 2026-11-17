import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Eye, RotateCcw, Rocket, TrendingDown, TriangleAlert, Wand2 } from 'lucide-react-native';

import { Badge, Button } from '@/components/ui';
import type { BadgeTone } from '@/components/ui/Badge';
import { formatRelative } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { StudioJob, StudioReviewItem } from '@/types/hubStudioJobs';

import { isPreflightOnlyFailure } from '../domain/board';
import { formatJobDuration, STUDIO_JOB_STATUS_LABEL } from '../domain/jobs';
import { describeJobProblem, PREFLIGHT_VERDICT_LABEL } from '../domain/review-messages';
import { isScoreDrop } from '../hooks/useStudioQueue';

const VERDICT_TONE: Record<'READY' | 'ATTENTION' | 'BLOCKED', BadgeTone> = {
  READY: 'green',
  ATTENTION: 'amber',
  BLOCKED: 'red',
};

/** Barre de progression fine (0 à 100). */
function ProgressBar({ value, color }: { value: number; color?: string }) {
  const styles = useStyles();
  const t = useTheme();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ now: pct, min: 0, max: 100 }}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? t.accent }]} />
    </View>
  );
}

/** Progression d'un job sur une carte : en file (position) ou en cours (étape, pourcentage, chrono). */
function ActiveJobProgress({ job, now }: { job: StudioJob; now: number }) {
  const styles = useStyles();
  const queued = job.status === 'QUEUED';
  const current = job.steps?.find((step) => step.status === 'running');
  const label = job.type === 'DEPLOY' ? 'Déploiement' : 'Préparation';
  return (
    <View style={styles.progress}>
      <View style={styles.progressTop}>
        <Text style={styles.progressText} numberOfLines={1}>
          {queued
            ? `${label} en file${job.queuePosition ? ` · position ${job.queuePosition}` : ''}`
            : `${label} · ${current?.label ?? 'en cours'}`}
        </Text>
        {!queued ? (
          <Text style={styles.progressText}>
            {Math.round(job.progress)} % · {formatJobDuration(job.startedAt ?? job.createdAt, null, now)}
          </Text>
        ) : null}
      </View>
      <ProgressBar value={queued ? 0 : job.progress} />
    </View>
  );
}

type ReviewCardProps = {
  item: StudioReviewItem;
  now: number;
  deployBlockedReason: string | null;
  failure: StudioJob | null;
  activeJob: StudioJob | null;
  retrying: boolean;
  onReview: (item: StudioReviewItem) => void;
  onDeploy: (item: StudioReviewItem, failure: StudioJob | null) => void;
  onDismiss: (item: StudioReviewItem) => void;
};

/** Fiche à relire, déployer ou reprendre (ligne « À traiter »). */
function ReviewCardBase({
  item,
  now,
  deployBlockedReason,
  failure,
  activeJob,
  retrying,
  onReview,
  onDeploy,
  onDismiss,
}: ReviewCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const worse = isScoreDrop(item);
  const toActivate = item.stage === 'TO_ACTIVATE';
  const shownFailure = activeJob || (failure && isPreflightOnlyFailure(failure)) ? null : failure;
  const problem = shownFailure ? describeJobProblem(shownFailure) : null;
  const verdict = item.preflight?.verdict ?? null;
  const issues = item.preflight?.issues ?? [];
  const blockerIssues = issues.filter((i) => i.severity === 'blocker' && !i.autoFixed);
  const warningIssues = issues.filter((i) => i.severity === 'warning' && !i.autoFixed);
  const fixedCount = issues.filter((i) => i.autoFixed).length;
  const blockersCount = item.deployBlockers?.length ?? 0;
  const stepsTotal = item.stepsTotal ?? 0;
  const stepsDone = item.stepsValidated ?? 0;

  const badge: { label: string; tone: BadgeTone } = activeJob
    ? {
        label: activeJob.type === 'DEPLOY' ? 'Déploiement en cours' : 'Préparation en cours',
        tone: 'blue',
      }
    : shownFailure
      ? shownFailure.status === 'FAILED'
        ? { label: 'Échec', tone: 'red' }
        : { label: 'Partiel', tone: 'amber' }
      : toActivate
        ? { label: 'À mettre en ligne', tone: 'amber' }
        : verdict
          ? { label: PREFLIGHT_VERDICT_LABEL[verdict], tone: VERDICT_TONE[verdict] }
          : { label: 'À relire', tone: 'blue' };

  const idle = !item.busy && !activeJob;
  const note =
    idle && blockerIssues.length > 0
      ? {
          color: t.danger,
          warn: true,
          text: `${blockerIssues.length} point${blockerIssues.length > 1 ? 's' : ''} à corriger : ${blockerIssues[0]?.title ?? ''}`,
        }
      : idle && !item.preflight && blockersCount > 0
        ? {
            color: t.danger,
            warn: true,
            text: `Bloquée : ${blockersCount} critère${blockersCount > 1 ? 's' : ''} manquant${blockersCount > 1 ? 's' : ''}`,
          }
        : idle && warningIssues.length > 0
          ? {
              color: t.warning,
              warn: true,
              text: `${warningIssues[0]?.title ?? ''}${warningIssues.length > 1 ? ` (+${warningIssues.length - 1})` : ''}`,
            }
          : idle && fixedCount > 0
            ? {
                color: t.success,
                warn: false,
                text: `${fixedCount} correction${fixedCount > 1 ? 's' : ''} automatique${fixedCount > 1 ? 's' : ''}`,
              }
            : null;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Relire ${item.reference}`}
        disabled={Boolean(activeJob)}
        onPress={() => onReview(item)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.head}>
          <Text style={styles.reference} numberOfLines={1}>
            {item.reference}
          </Text>
          <Badge label={badge.label} tone={badge.tone} />
        </View>
        {item.designation ? (
          <Text style={styles.designation} numberOfLines={2}>
            {item.designation}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={1}>
          {item.requestedByEmail ?? 'Demandeur inconnu'} ·{' '}
          {formatRelative(item.appliedAt ?? item.preparedAt, now) ?? '—'}
        </Text>

        <View style={styles.stats}>
          <View style={styles.scores}>
            <Text style={styles.scoreCurrent}>{item.currentScore ?? '—'}</Text>
            <ArrowRight size={12} color={t.textFaint} />
            <Text style={[styles.scoreProjected, worse && { color: t.danger }]}>
              {item.projectedScore ?? '—'}
            </Text>
            {worse ? <TrendingDown size={14} color={t.danger} /> : null}
          </View>
          {stepsTotal > 0 ? (
            <View style={styles.steps}>
              <View style={styles.stepsBar}>
                <ProgressBar
                  value={(stepsDone / stepsTotal) * 100}
                  color={stepsDone === stepsTotal ? t.success : t.accent}
                />
              </View>
              <Text style={styles.stepsText}>
                {stepsDone}/{stepsTotal} étapes
              </Text>
            </View>
          ) : null}
          {item.warningsCount > 0 ? (
            <Text style={[styles.stepsText, { color: t.warning }]}>
              {item.warningsCount} remarque{item.warningsCount > 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>

        {activeJob ? <ActiveJobProgress job={activeJob} now={now} /> : null}

        {note ? (
          <View style={styles.note}>
            {note.warn ? (
              <TriangleAlert size={13} color={note.color} />
            ) : (
              <Wand2 size={13} color={note.color} />
            )}
            <Text style={[styles.noteText, { color: note.color }]} numberOfLines={2}>
              {note.text}
            </Text>
          </View>
        ) : null}

        {shownFailure && problem ? (
          <View style={styles.note}>
            <TriangleAlert size={13} color={shownFailure.status === 'FAILED' ? t.danger : t.warning} />
            <Text
              style={[
                styles.noteText,
                { color: shownFailure.status === 'FAILED' ? t.danger : t.warning },
              ]}
              numberOfLines={3}
            >
              {STUDIO_JOB_STATUS_LABEL[shownFailure.status]} : {problem.message}
            </Text>
          </View>
        ) : null}

        {deployBlockedReason && idle && !note ? (
          <Text style={styles.reason} numberOfLines={2}>
            {deployBlockedReason}
          </Text>
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <Button
          label="Relire"
          leadingIcon={<Eye size={14} color={t.onAccent} />}
          disabled={Boolean(activeJob)}
          onPress={() => onReview(item)}
          style={styles.flex}
        />
        <Button
          label={shownFailure ? 'Reprendre' : 'Déployer'}
          variant="outline"
          leadingIcon={
            shownFailure ? (
              <RotateCcw size={14} color={t.text} />
            ) : (
              <Rocket size={14} color={t.text} />
            )
          }
          loading={retrying}
          disabled={Boolean(deployBlockedReason) || Boolean(activeJob)}
          onPress={() => onDeploy(item, shownFailure ?? null)}
          style={styles.flex}
        />
        <Button
          label="Écarter"
          variant="ghost"
          disabled={Boolean(activeJob)}
          onPress={() => onDismiss(item)}
        />
      </View>
    </View>
  );
}

export const ReviewCard = memo(ReviewCardBase);

type JobCardProps = {
  kind: 'deploying' | 'failure' | 'provisional';
  job: StudioJob;
  now: number;
  retrying?: boolean;
  onRetry?: (job: StudioJob) => void;
  onRework?: (job: StudioJob) => void;
  onDismiss?: (job: StudioJob) => void;
};

/** Carte issue d'un job seul : déploiement en cours, échec à reprendre ou préparation tout juste terminée. */
function JobCardBase({ kind, job, now, retrying = false, onRetry, onRework, onDismiss }: JobCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const problem = kind === 'failure' ? describeJobProblem(job) : null;
  const failed = job.status === 'FAILED';
  const badge: { label: string; tone: BadgeTone } =
    kind === 'deploying'
      ? { label: 'Déploiement en cours', tone: 'blue' }
      : kind === 'provisional'
        ? { label: 'Préparée, relecture en cours de chargement', tone: 'blue' }
        : failed
          ? { label: 'Échec', tone: 'red' }
          : { label: 'Partiel', tone: 'amber' };

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.reference} numberOfLines={1}>
            {job.reference}
          </Text>
          <Badge label={badge.label} tone={badge.tone} />
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {job.requestedByEmail ?? 'Demandeur inconnu'} ·{' '}
          {formatRelative(job.finishedAt ?? job.createdAt, now) ?? '—'}
        </Text>
        {kind === 'deploying' ? <ActiveJobProgress job={job} now={now} /> : null}
        {problem ? (
          <View style={styles.note}>
            <TriangleAlert size={13} color={failed ? t.danger : t.warning} />
            <Text style={[styles.noteText, { color: failed ? t.danger : t.warning }]} numberOfLines={4}>
              {problem.message}
            </Text>
          </View>
        ) : null}
      </View>
      {kind === 'failure' ? (
        <View style={styles.actions}>
          <Button
            label="Reprendre"
            leadingIcon={<RotateCcw size={14} color={t.onAccent} />}
            loading={retrying}
            onPress={() => onRetry?.(job)}
            style={styles.flex}
          />
          <Button
            label="Ouvrir le Studio"
            variant="outline"
            onPress={() => onRework?.(job)}
            style={styles.flex}
          />
          <Button label="Écarter" variant="ghost" onPress={() => onDismiss?.(job)} />
        </View>
      ) : null}
    </View>
  );
}

export const JobCard = memo(JobCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  body: { gap: spacing.sm, padding: spacing.lg },
  pressed: { backgroundColor: t.cardPressed },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  reference: {
    flexShrink: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
  },
  designation: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  meta: { fontSize: 11, color: t.textSubtle },
  stats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  scores: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  scoreCurrent: { fontSize: fontSize.sm, fontWeight: '600', color: t.textMuted },
  scoreProjected: { fontSize: fontSize.base, fontWeight: '800', color: t.success },
  steps: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  stepsBar: { width: 56 },
  stepsText: { fontSize: 11, fontWeight: '600', color: t.textMuted },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: t.surface,
  },
  fill: { height: '100%', borderRadius: radius.full },
  progress: { gap: spacing.xs },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  progressText: { flexShrink: 1, fontSize: 11, fontWeight: '600', color: t.info },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs + 2 },
  noteText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  reason: { fontSize: 11, color: t.textSubtle, lineHeight: 15 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  flex: { flex: 1 },
}));
