import { useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleSlash, History, RefreshCw, ScanSearch, TriangleAlert, WifiOff } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { EmptyState } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { AnalysisReusedData } from '@/types/hubProductAnalyzer';

import {
  AlreadyAnalyzedDialog,
  BlockedDialog,
  ReusedDialog,
  WeightDialog,
} from '../components/AnalysisDialogs';
import { fmtClock, PipelineCard } from '../components/PipelineCard';
import { useSingleAnalysis } from '../hooks/useSingleAnalysis';
import { withForce } from '../lib/requests';
import { useSkipWeight } from '../lib/preferences';
import { backToHistory, openPaEdit, openPaLauncher, replaceWithPaFiche } from '../navigation';

/**
 * Suivi d'une analyse unitaire en direct. À la fin, la fiche remplace cet écran ; les cas
 * particuliers (poids, produit bloqué, déjà analysé, réutilisé, EBAT introuvable) s'ouvrent en
 * feuilles interactives.
 */
export function LiveScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { connection, single, live, pipeline, active, elapsed, queueBusy, start, retry, cancel, respondWeight, reset } =
    useSingleAnalysis();
  const [skipWeight, setSkipWeight] = useSkipWeight();
  const handledRun = useRef<number | null>(null);

  const { phase, request } = single;

  // Analyse terminée : léger retour haptique puis ouverture de la fiche.
  useEffect(() => {
    if (phase !== 'completing' || !single.stagingId || handledRun.current === single.runId) return;
    handledRun.current = single.runId;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const opportunityUuid = request?.opportunityUuid;
    replaceWithPaFiche(single.stagingId, opportunityUuid);
    reset();
  }, [phase, single.stagingId, single.runId, request?.opportunityUuid, reset]);

  const relaunch = (force: 'reanalyze' | 'catalogue') => {
    if (!request) return;
    const next = withForce(request, force);
    reset();
    start(next);
  };

  const closeToHistory = () => {
    reset();
    backToHistory();
  };

  const openFiche = (uuid: string) => {
    const opportunityUuid = request?.opportunityUuid;
    reset();
    replaceWithPaFiche(uuid, opportunityUuid);
  };

  const attachEan = (stagingId: string, ean?: string | null, warehouse?: string | null) => {
    reset();
    openPaEdit('ean', {
      uuid: stagingId,
      mode: 'attach',
      from: 'live',
      ...(ean ? { ean } : {}),
      ...(warehouse ? { warehouse } : {}),
      ...(request?.opportunityUuid ? { opportunityUuid: request.opportunityUuid } : {}),
    });
  };

  const onAttachFromReused = (data: AnalysisReusedData) =>
    attachEan(data.staging.uuid, data.staging.ean, data.warehouse);

  if (phase === 'idle') {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Analyse' }} />
        <EmptyState
          icon={<ScanSearch size={28} color={t.textFaint} />}
          title="Aucune analyse en cours"
          text="Lancez une analyse depuis l'historique pour la suivre ici."
        />
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Button label="Analyser un produit" onPress={() => { router.back(); openPaLauncher(); }} />
        </View>
      </View>
    );
  }

  const failed = phase === 'failed' || phase === 'interrupted';
  const cancelled = phase === 'cancelled';
  const ebatNotFound = phase === 'ebat_not_found';
  const label = request?.label ?? 'Analyse';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Analyse' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.label} numberOfLines={2}>
              {label}
            </Text>
            <Text style={styles.sub}>
              {active ? (phase === 'pending' ? 'Démarrage…' : 'Analyse en cours') : statusTitle(phase)}
            </Text>
          </View>
          <View style={styles.timer}>
            <Text style={styles.timerText} accessibilityLabel={`Durée ${fmtClock(elapsed)}`}>
              {fmtClock(elapsed)}
            </Text>
          </View>
        </View>

        {!connection.connected && active ? (
          <View style={[styles.banner, { borderColor: withAlpha(t.warning, 0.4), backgroundColor: withAlpha(t.warning, 0.1) }]}>
            <WifiOff size={16} color={t.warning} />
            <Text style={[styles.bannerText, { color: t.warning }]}>Reconnexion au serveur d’analyse…</Text>
          </View>
        ) : null}

        {queueBusy ? (
          <View style={[styles.banner, { borderColor: withAlpha(t.info, 0.4), backgroundColor: withAlpha(t.info, 0.1) }]}>
            <Text style={[styles.bannerText, { color: t.info }]}>
              Une file d’analyses est en cours : cette analyse démarrera quand elle sera terminée.
            </Text>
          </View>
        ) : null}

        {failed ? (
          <View style={[styles.banner, styles.errorBox, { borderColor: withAlpha(t.danger, 0.4), backgroundColor: withAlpha(t.danger, 0.1) }]}>
            <TriangleAlert size={18} color={t.danger} />
            <View style={styles.errorText}>
              <Text style={[styles.errorTitle, { color: t.danger }]}>
                {phase === 'interrupted' ? 'Analyse interrompue' : "L'analyse a échoué"}
              </Text>
              {single.errors.map((message) => (
                <Text key={message} style={[styles.bannerText, { color: t.text }]}>
                  {message}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {cancelled ? (
          <View style={[styles.banner, { borderColor: t.border, backgroundColor: t.surface }]}>
            <CircleSlash size={18} color={t.textMuted} />
            <Text style={[styles.bannerText, { color: t.textMuted }]}>Analyse annulée.</Text>
          </View>
        ) : null}

        {ebatNotFound ? (
          <View style={[styles.banner, styles.errorBox, { borderColor: withAlpha(t.warning, 0.4), backgroundColor: withAlpha(t.warning, 0.1) }]}>
            <TriangleAlert size={18} color={t.warning} />
            <View style={styles.errorText}>
              <Text style={[styles.errorTitle, { color: t.warning }]}>Référence introuvable dans EbatPro</Text>
              <Text style={[styles.bannerText, { color: t.text }]}>
                Un enregistrement a été créé. Attachez un EAN pour poursuivre l’analyse sans EbatPro.
              </Text>
            </View>
          </View>
        ) : null}

        <PipelineCard live={live} pipeline={pipeline} finished={phase === 'completing'} />
      </ScrollView>

      <View style={[styles.actions, styles.floating, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {active ? (
          <Button label="Annuler l'analyse" variant="outline" onPress={cancel} />
        ) : failed ? (
          <>
            <Button
              label="Réessayer"
              leadingIcon={<RefreshCw size={16} color={t.onAccent} />}
              onPress={retry}
            />
            <Button label="Fermer" variant="ghost" onPress={closeToHistory} />
          </>
        ) : ebatNotFound && single.stagingId ? (
          <>
            <Button
              label="Attacher un EAN et analyser"
              onPress={() => attachEan(single.stagingId as string)}
            />
            <Button label="Voir la fiche" variant="outline" onPress={() => openFiche(single.stagingId as string)} />
            <Button label="Fermer" variant="ghost" onPress={closeToHistory} />
          </>
        ) : cancelled ? (
          <>
            <Button
              label="Nouvelle analyse"
              onPress={() => {
                reset();
                router.back();
                openPaLauncher();
              }}
            />
            <Button
              label="Retour à l'historique"
              variant="ghost"
              leadingIcon={<History size={16} color={t.textMuted} />}
              onPress={closeToHistory}
            />
          </>
        ) : null}
      </View>

      <WeightDialog
        request={single.weight}
        skipWeight={skipWeight}
        onSkipWeight={setSkipWeight}
        onSubmit={respondWeight}
      />
      <BlockedDialog
        data={phase === 'blocked' ? single.blocked : null}
        onClose={closeToHistory}
        onForce={() => relaunch('catalogue')}
      />
      <AlreadyAnalyzedDialog
        data={phase === 'already_analyzed' ? single.alreadyAnalyzed : null}
        onClose={closeToHistory}
        onRelaunch={() => relaunch('reanalyze')}
        onOpenFiche={openFiche}
      />
      <ReusedDialog
        data={phase === 'reused' ? single.reused : null}
        onClose={closeToHistory}
        onOpenFiche={openFiche}
        onAttachEan={onAttachFromReused}
      />
    </View>
  );
}

function statusTitle(phase: string): string {
  switch (phase) {
    case 'completing':
      return 'Analyse terminée';
    case 'failed':
      return 'Échec';
    case 'interrupted':
      return 'Interrompue';
    case 'cancelled':
      return 'Annulée';
    case 'ebat_not_found':
      return 'EbatPro : référence introuvable';
    default:
      return 'Terminée';
  }
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.bg },
  content: { gap: spacing.lg, padding: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headText: { flex: 1, gap: 2 },
  label: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
  timer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: t.surface,
  },
  timerText: { fontSize: fontSize.sm, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  bannerText: { flexShrink: 1, fontSize: fontSize.sm },
  errorBox: { alignItems: 'flex-start' },
  errorText: { flex: 1, gap: spacing.xs },
  errorTitle: { fontSize: fontSize.sm, fontWeight: '700' },
  actions: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  floating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bg,
  },
}));
