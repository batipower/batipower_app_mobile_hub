import { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Activity, Pause, Play } from 'lucide-react-native';

import type { LiveAffaire, LiveAnalysis, LivePoste } from '@/api/hubAnalysesLive';
import { useAuth } from '@/auth/AuthProvider';
import { canViewHubAnalysesLive } from '@/auth/permissions';
import { Badge, Button, Card } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SegmentedControl, type Segment } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { useAnalysesLive, usePosteControlActions } from './hooks/useAnalysesLive';
import { LiveProgressBar, ProgressLabel } from './LiveProgressBar';
import {
  affaireEnAttente,
  affaireKey,
  affairesOfPoste,
  affaireState,
  affaireTotals,
  isPosteVisible,
  resolveAffaires,
  SERVER_RESTART_NOTICE_MS,
  type AffaireState,
} from './liveAffaires';
import {
  analysisProgress,
  formatAgo,
  formatInt,
  posteHealth,
  posteTitle,
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

const HEALTH_TEXT: Record<PosteHealth, string | null> = {
  ok: null,
  slow: 'Signal lent',
  lost: 'Signal perdu',
};

type PosteCardProps = {
  poste: LivePoste;
  analyses: LiveAnalysis[];
  affaires: LiveAffaire[];
  now: number;
  busy: boolean;
  onPause: (poste: LivePoste) => void;
  onResume: (poste: LivePoste) => void;
};

function PosteCard({ poste, analyses, affaires, now, busy, onPause, onResume }: PosteCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const paused = poste.control === 'PAUSED';
  const health = posteHealth(poste, now);
  const reserveTotal = poste.done + poste.enCours;
  const posteAffaires = affairesOfPoste(affaires, poste.key);
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

      {reserveTotal > 0 ? (
        <View style={styles.block}>
          <View style={styles.line}>
            <Text style={styles.label}>Réserve</Text>
            <ProgressLabel done={poste.done} total={reserveTotal} />
          </View>
          <LiveProgressBar
            done={poste.done}
            active={analyses.length > 0 ? Math.min(analyses.length, poste.enCours) : 0}
            total={reserveTotal}
            doneColor={paused ? t.warning : undefined}
          />
          {poste.currentPosition ? (
            <Text style={styles.meta}>{`Ligne ${poste.currentPosition} en cours`}</Text>
          ) : null}
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
            <LiveProgressBar done={progress.position > 0 ? progress.position - 1 : 0} active={progress.position > 0 ? 1 : 0} total={progress.total} height={6} />
          </View>
        );
      })}

      {posteAffaires.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Par affaire</Text>
          {posteAffaires.map(({ affaire, done, enCours }) => (
            <View key={affaireKey(affaire)} style={styles.miniAffaire}>
              <View style={styles.line}>
                <Text style={styles.miniName} numberOfLines={1}>
                  {affaire.name}
                </Text>
                <Text style={styles.meta}>
                  {`affaire : ${formatInt(affaire.done)} / ${formatInt(affaire.total)} · ${affaire.total > 0 ? Math.round((affaire.done / affaire.total) * 100) : 0} %`}
                </Text>
              </View>
              <LiveProgressBar
                done={affaire.done}
                active={affaire.enCours}
                total={affaire.total}
                height={4}
              />
              <Text style={styles.meta}>
                {`cet agent : ${formatInt(done)} analysées · ${formatInt(enCours)} en cours`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

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

type AffaireCardProps = {
  affaire: LiveAffaire;
  /** Agents connectés, par clé de poste (seuls ceux-là sont listés sous l'affaire). */
  postesByKey: Map<string, LivePoste>;
};

const STATE_BADGE: Record<AffaireState, { label: string; tone: 'green' | 'blue' | 'amber' } | null> = {
  done: { label: 'Terminée', tone: 'green' },
  analysing: { label: 'Analyse en cours', tone: 'blue' },
  stopped: { label: "À l'arrêt, aucun agent", tone: 'amber' },
  idle: null,
};

/** Avancement global d'une affaire (analysées / en cours / en attente), avec les agents connectés dessus. */
function AffaireCard({ affaire, postesByKey }: AffaireCardProps) {
  const styles = useStyles();
  const enAttente = affaireEnAttente(affaire);
  const total = affaire.total;
  const percent = total > 0 ? Math.round((affaire.done / total) * 100) : 0;
  const badge = STATE_BADGE[affaireState(affaire, new Set(postesByKey.keys()))];
  const agents = affaire.postes.filter((part) => postesByKey.has(part.key));
  return (
    <Card contentStyle={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {affaire.name}
          </Text>
          <Text style={styles.meta}>
            {affaire.rank != null ? `Classement n° ${affaire.rank}` : 'Hors classement'}
          </Text>
        </View>
        {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
      </View>

      <View style={styles.block}>
        <View style={styles.line}>
          <Text style={styles.label}>{`${formatInt(affaire.done)} / ${formatInt(total)} lignes analysées`}</Text>
          <Text style={styles.value}>{`${percent} %`}</Text>
        </View>
        <LiveProgressBar done={affaire.done} active={affaire.enCours} total={total} height={10} />
        <Text style={styles.meta}>
          {`${formatInt(affaire.done)} analysées · ${formatInt(affaire.enCours)} en cours · ${formatInt(enAttente)} en attente`}
        </Text>
      </View>

      {agents.length > 0 ? (
        <View style={styles.block}>
          {agents.map((part) => {
            const poste = postesByKey.get(part.key);
            return (
              <View key={part.key} style={styles.line}>
                <Text style={styles.miniName} numberOfLines={1}>
                  {poste ? posteTitle(poste) : 'Poste inconnu'}
                </Text>
                <Text style={styles.meta}>
                  {`${formatInt(part.done)} analysées · ${formatInt(part.enCours)} en cours`}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

type ViewKey = 'affaires' | 'agents';

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
  const [view, setView] = useState<ViewKey>('affaires');
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
  const analyses = useMemo(() => data?.analyses ?? [], [data]);
  const analysingKeys = useMemo(() => new Set(analyses.map((a) => a.posteKey)), [analyses]);
  const allPostes = data?.postes ?? [];
  // Seuls les agents connectés sont listés (un agent en pause reste affiché tant qu'il est connecté).
  const postes = allPostes.filter((p) => isPosteVisible(p, analysingKeys, now));
  const postesByKey = useMemo(() => new Map(postes.map((p) => [p.key, p])), [postes]);
  const affaires = useMemo(() => resolveAffaires(data), [data]);
  const totals = affaireTotals(affaires);
  const analysesOf = (poste: LivePoste) => analyses.filter((analysis) => analysis.posteKey === poste.key);

  const startedAtMs = data?.serverStartedAt ? new Date(data.serverStartedAt).getTime() : null;
  const restartedRecently = startedAtMs != null && now - startedAtMs < SERVER_RESTART_NOTICE_MS;

  const segments: Segment<ViewKey>[] = [
    { key: 'affaires', label: 'Par affaire', count: affaires.length },
    { key: 'agents', label: 'Par agent', count: postes.length },
  ];

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
      <View style={styles.introRow}>
        <Text style={styles.intro}>
          Avancement de la réserve du Product Analyzer, par affaire et par agent.
        </Text>
        <Badge label={query.realtime ? 'Temps réel' : 'Toutes les 3 s'} tone={query.realtime ? 'green' : 'amber'} />
      </View>

      {restartedRecently ? (
        <Text style={styles.restartBanner}>
          {`Le serveur a redémarré ${formatAgo(data?.serverStartedAt ?? null, now)}. Les agents se réannoncent et relancent leurs analyses : l'avancement se remet à jour tout seul.`}
        </Text>
      ) : null}

      {query.isError ? (
        <ErrorBanner
          error={query.error}
          fallback="Impossible de charger les analyses en cours"
          onRetry={() => void onRefresh()}
        />
      ) : null}

      {query.isPending ? <ListSkeleton rows={3} height={150} /> : null}

      {data && totals.total > 0 ? (
        <Card contentStyle={styles.card}>
          <View style={styles.line}>
            <Text style={styles.label}>Avancement global</Text>
            <ProgressLabel done={totals.done} total={totals.total} />
          </View>
          <LiveProgressBar done={totals.done} active={totals.enCours} total={totals.total} height={12} />
          <Text style={styles.meta}>
            {`${formatInt(totals.done)} analysées · ${formatInt(totals.enCours)} en cours · ${formatInt(totals.enAttente)} en attente · reste ${formatInt(totals.enCours + totals.enAttente)}`}
          </Text>
          <Text style={styles.meta}>
            {`${postes.length} agent${postes.length > 1 ? 's' : ''} connecté${postes.length > 1 ? 's' : ''} · ${analyses.length} analyse${analyses.length > 1 ? 's' : ''} en cours`}
          </Text>
        </Card>
      ) : null}

      {data ? <SegmentedControl segments={segments} value={view} onChange={setView} /> : null}

      {data && view === 'affaires' && affaires.length === 0 ? (
        <EmptyState
          icon={<Activity size={24} color={t.textMuted} />}
          title="Aucune affaire en cours"
          text="Une affaire apparaît ici dès qu'un agent prend en charge des lignes de la réserve."
        />
      ) : null}

      {data && view === 'agents' && postes.length === 0 ? (
        <EmptyState
          icon={<Activity size={24} color={t.textMuted} />}
          title="Aucun agent connecté"
          text="Un agent apparaît ici dès qu'il se connecte pour analyser la réserve."
        />
      ) : null}

      {view === 'affaires'
        ? affaires.map((affaire) => (
            <AffaireCard key={affaireKey(affaire)} affaire={affaire} postesByKey={postesByKey} />
          ))
        : postes.map((poste) => (
            <PosteCard
              key={poste.key}
              poste={poste}
              analyses={analysesOf(poste)}
              affaires={affaires}
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
  introRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  intro: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  restartBanner: {
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.warning,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  miniAffaire: { gap: 3 },
  miniName: { flex: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.textSubtle },
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
  stopButton: { borderWidth: 1, borderColor: withAlpha(t.danger, 0.3) },
}));
