import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Activity, Pause, Play } from 'lucide-react-native';

import type { LiveAnalysis, LivePoste } from '@/api/hubAnalysesLive';
import { useAuth } from '@/auth/AuthProvider';
import { canViewHubAnalysesLive } from '@/auth/permissions';
import { Badge, Button, Card } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { useAnalysesLive, usePosteControlActions } from './hooks/useAnalysesLive';
import {
  analysisProgress,
  formatAgo,
  posteHealth,
  posteTitle,
  reserveProgress,
  type PosteHealth,
} from './liveFormat';

/** Horloge locale (1 s) pour les durées « il y a … ». */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const HEALTH_TEXT: Record<PosteHealth, string | null> = {
  ok: null,
  slow: 'Signal lent',
  lost: 'Signal perdu',
};

type PosteCardProps = {
  poste: LivePoste;
  analyses: LiveAnalysis[];
  now: number;
  busy: boolean;
  onPause: (poste: LivePoste) => void;
  onResume: (poste: LivePoste) => void;
};

function PosteCard({ poste, analyses, now, busy, onPause, onResume }: PosteCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const paused = poste.control === 'PAUSED';
  const health = posteHealth(poste, now);
  const reserve = reserveProgress(poste);
  const healthText = HEALTH_TEXT[health];
  const device = poste.device?.label;
  // Un poste non identifié ne peut être piloté : le back refuse `unidentified`.
  const controllable = poste.identified;

  return (
    <Card contentStyle={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {posteTitle(poste)}
          </Text>
          {device ? (
            <Text style={styles.meta} numberOfLines={1}>
              {device}
            </Text>
          ) : null}
        </View>
        <View style={styles.badges}>
          {paused ? <Badge label="En pause" tone="amber" /> : null}
          {healthText ? <Badge label={healthText} tone={health === 'lost' ? 'red' : 'amber'} /> : null}
        </View>
      </View>

      {paused ? (
        <Text style={styles.pausedText}>
          {`Arrêté${poste.pausedBy ? ` par ${poste.pausedBy}` : ''}${poste.pausedAt ? ` ${formatAgo(poste.pausedAt, now)}` : ''}. La file est gelée, les lignes restent réservées.`}
        </Text>
      ) : null}

      {reserve.total > 0 ? (
        <View style={styles.block}>
          <View style={styles.line}>
            <Text style={styles.label}>Réserve</Text>
            <Text style={styles.value}>{`${reserve.fraction} · ${reserve.percent} %`}</Text>
          </View>
          <ProgressBar percent={reserve.percent} color={paused ? t.warning : t.success} />
          {reserve.position ? <Text style={styles.meta}>{`Ligne ${reserve.position} en cours`}</Text> : null}
        </View>
      ) : null}

      {analyses.map((analysis) => {
        const progress = analysisProgress(analysis);
        return (
          <View key={analysis.jobId} style={styles.analysis}>
            <View style={styles.line}>
              <Text style={styles.analysisRef} numberOfLines={1}>
                {`${analysis.kind === 'EAN' ? 'EAN' : 'Code'} ${analysis.ref}`}
              </Text>
              <Text style={styles.meta}>{formatAgo(analysis.startedAt, now).replace('il y a ', '')}</Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {progress.position > 0
                ? `Étape ${progress.position}/${progress.total} · ${progress.label}`
                : progress.label}
            </Text>
            <ProgressBar percent={progress.percent} color={t.accent} />
          </View>
        );
      })}

      {analyses.length === 0 && !paused ? (
        <Text style={styles.meta}>Aucune analyse en cours sur ce poste.</Text>
      ) : null}

      <Text style={styles.meta}>{`Dernier signe de vie : ${formatAgo(poste.heartbeatAt ?? poste.lastSeenAt, now)}`}</Text>

      {controllable ? (
        paused ? (
          <Button
            label="Relancer"
            loading={busy}
            onPress={() => onResume(poste)}
            leadingIcon={<Play size={16} color={t.onAccent} />}
          />
        ) : (
          <Button
            label="Arrêter"
            variant="ghost"
            destructive
            style={styles.stopButton}
            loading={busy}
            onPress={() => onPause(poste)}
            leadingIcon={<Pause size={16} color={t.danger} />}
          />
        )
      ) : null}
    </Card>
  );
}

/** « Analyses en cours » du HUB (SUPERADMIN) : suivi des postes et arrêt / relance à distance. */
export function AnalysesEnCoursScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canViewHubAnalysesLive(user.role) ? (
    <AnalysesEnCours />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="Les analyses en cours sont réservées au compte Super Admin."
    />
  );
}

function AnalysesEnCours() {
  const styles = useStyles();
  const t = useTheme();
  const query = useAnalysesLive({ watching: true });
  const { pause, resume } = usePosteControlActions();
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const now = useNow(1000);
  const data = query.data;

  const confirmPause = (poste: LivePoste) => {
    Alert.alert(
      'Arrêter ce poste ?',
      `${posteTitle(poste)} : l'analyse en cours sera coupée et sa file gelée. Les lignes restent réservées, vous pourrez relancer le poste.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Arrêter', style: 'destructive', onPress: () => pause.mutate(poste.key) },
      ],
    );
  };

  const pendingKey = pause.isPending ? pause.variables : resume.isPending ? resume.variables : null;
  const postes = data?.postes ?? [];
  const analysesOf = (poste: LivePoste) =>
    (data?.analyses ?? []).filter((analysis) => analysis.posteKey === poste.key);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.accentText}
        />
      }
    >
      <Text style={styles.intro}>
        Postes qui analysent la réserve du Product Analyzer. Actualisation automatique toutes les 3 secondes.
      </Text>

      {query.isError ? (
        <ErrorBanner
          error={query.error}
          fallback="Impossible de charger les analyses en cours"
          onRetry={() => void onRefresh()}
        />
      ) : null}

      {query.isPending ? <ListSkeleton rows={3} height={150} /> : null}

      {data && postes.length === 0 ? (
        <EmptyState
          icon={<Activity size={24} color={t.textMuted} />}
          title="Aucun poste actif"
          text="Un poste apparaît ici dès qu'il lance des analyses sur la réserve."
        />
      ) : null}

      {postes.map((poste) => (
        <PosteCard
          key={poste.key}
          poste={poste}
          analyses={analysesOf(poste)}
          now={now}
          busy={pendingKey === poste.key}
          onPause={confirmPause}
          onResume={(item) => resume.mutate(item.key)}
        />
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  intro: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  card: { padding: spacing.lg, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitleBlock: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  badges: { alignItems: 'flex-end', gap: spacing.xs },
  pausedText: {
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.warning,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  block: { gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: t.textSubtle },
  value: { fontSize: fontSize.sm, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] },
  meta: { fontSize: fontSize.xs, color: t.textMuted },
  analysis: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: withAlpha(t.neutral, 0.08),
  },
  analysisRef: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: withAlpha(t.neutral, 0.2),
  },
  fill: { height: '100%', borderRadius: radius.full },
  stopButton: { borderWidth: 1, borderColor: withAlpha(t.danger, 0.3) },
}));
