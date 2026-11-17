import { useCallback, useEffect, type ComponentType } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EllipsisVertical, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubStudioQueue } from '@/auth/permissions';
import { STUDIO_JOBS_QUERY_KEY, hubProductStudioJobsApi } from '@/api/hubProductStudioJobs';
import { Button } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';
import type { StudioStepId } from '@/types/hubStudio';

import { DEPLOY_STEP_DEFS } from '../domain/model';
import { STUDIO_JOB_TYPE_LABEL } from '../domain/jobs';
import { useLatest } from '../lib/useLatest';
import { removeFromReviewCache } from '../hooks/useQueueActions';
import { closeStudio, showStudioReference } from '../navigation';
import {
  endReviewSession,
  getReviewSession,
  removeFromReviewSession,
  setReviewIndex,
  useReviewSession,
} from '../sessionStore';
import { StudioConfirm } from './StudioConfirm';
import { StudioProvider, useStudio } from './StudioContext';
import { StudioSessionBar, StudioStepFooter, StudioStepper, StudioSummary } from './StudioChrome';
import { StudioProgress } from './StudioProgress';
import { AttributesTab } from './tabs/AttributesTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { ContentTab } from './tabs/ContentTab';
import { DeployStep } from './tabs/DeployStep';
import { GeoTab } from './tabs/GeoTab';
import { ImagesTab } from './tabs/ImagesTab';
import { RelatedTab } from './tabs/RelatedTab';

const TAB_COMPONENTS: Record<StudioStepId, ComponentType> = {
  images: ImagesTab,
  contenu: ContentTab,
  attributs: AttributesTab,
  geo: GeoTab,
  associes: RelatedTab,
  categories: CategoriesTab,
  deployer: DeployStep,
};

/** Studio d'une fiche produit : relecture par étapes puis déploiement (réservé au SUPERADMIN). */
export function StudioScreen() {
  const { user } = useAuth();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  if (!user) return null;
  if (!canAccessHubStudioQueue(user.role)) {
    return (
      <AccessDenied
        title="Accès réservé"
        text="Le Studio des fiches produit est réservé aux comptes Super Admin."
      />
    );
  }
  if (!reference) return null;
  return <StudioSession reference={reference} />;
}

/** Fin de la relecture : on referme le Studio et la file se rafraîchit. */
function useFinishReview() {
  return useCallback(() => {
    closeStudio();
    toast.success('Relecture terminée', {
      description: 'Toutes les fiches de la liste ont été parcourues.',
    });
  }, []);
}

function StudioSession({ reference }: { reference: string }) {
  const queryClient = useQueryClient();
  const finishReview = useFinishReview();

  // Le déploiement est parti en file : on enchaîne sur la fiche suivante (ou on termine).
  const onDeployQueued = useCallback(() => {
    setTimeout(() => {
      const session = getReviewSession();
      if (!session || session.references[session.index] !== reference) return;
      if (session.index < session.references.length - 1) {
        const next = session.references[session.index + 1];
        if (!next) return;
        setReviewIndex(session.index + 1);
        showStudioReference(next);
      } else if (session.references.length > 1) {
        finishReview();
      }
    }, 900);
  }, [finishReview, reference]);

  // Quitter l'écran par n'importe quel chemin termine la session et rafraîchit la file.
  useEffect(
    () => () => {
      endReviewSession();
      void queryClient.invalidateQueries({ queryKey: STUDIO_JOBS_QUERY_KEY });
    },
    [queryClient],
  );

  return (
    <StudioProvider key={reference} reference={reference} onDeployQueued={onDeployQueued}>
      <StudioLayout />
    </StudioProvider>
  );
}

function StudioLayout() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const studio = useStudio();
  const session = useReviewSession();
  const finishReview = useFinishReview();

  // Fermeture gardée : propose d'enregistrer s'il reste du travail non enregistré.
  const requestCloseRef = useLatest(studio.requestClose);
  const close = useCallback(() => requestCloseRef.current(() => closeStudio(), 'Enregistrer et fermer'), [requestCloseRef]);

  const goTo = useCallback(
    (index: number) => {
      const target = getReviewSession()?.references[index];
      if (!target) return;
      requestCloseRef.current(() => {
        setReviewIndex(index);
        showStudioReference(target);
      });
    },
    [requestCloseRef],
  );

  const dismiss = useMutation({
    mutationFn: (ref: string) => hubProductStudioJobsApi.dismissReview(ref),
    onSuccess: (_res, ref) => {
      toast.success('Fiche écartée de la liste');
      removeFromReviewCache(queryClient, [ref]);
      const next = removeFromReviewSession(ref);
      if (!next) {
        finishReview();
        return;
      }
      const target = next.references[next.index];
      if (target) showStudioReference(target);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Impossible d'écarter la fiche"),
  });

  const prepared = Boolean(studio.draft?.preparedAt);
  const idle =
    !studio.jobBusy && !studio.jobStarting && !studio.simulating && !studio.refreshingAndDeploying;

  const openMenu = () => {
    type Entry = { label: string; run: () => void; destructive?: boolean; enabled: boolean };
    const entries: Entry[] = [
      {
        label: 'Prévisualiser les changements',
        run: studio.simulate,
        enabled: Boolean(studio.draft) && idle,
      },
      ...(studio.draft?.previewUrl
        ? [
            {
              label: "Ouvrir l'aperçu de la fiche",
              run: () => void Linking.openURL(studio.draft?.previewUrl ?? ''),
              enabled: true,
            },
          ]
        : []),
      ...(studio.canRollback
        ? [
            {
              label: 'Annuler la dernière application',
              run: studio.requestRollback,
              destructive: true,
              enabled: !studio.rollingBack && idle,
            },
          ]
        : []),
      ...(prepared
        ? [
            {
              label: 'Relancer la préparation',
              run: () =>
                Alert.alert(
                  'Relancer la préparation',
                  'Le brouillon sera régénéré : les décisions en cours seront remplacées.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Relancer', style: 'destructive', onPress: () => void studio.startPrepare() },
                  ],
                ),
              enabled: idle && !studio.loading,
            },
          ]
        : []),
    ].filter((entry) => entry.enabled);

    if (entries.length === 0) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...entries.map((e) => e.label), 'Annuler'],
          cancelButtonIndex: entries.length,
          destructiveButtonIndex: entries.findIndex((e) => e.destructive),
        },
        (index) => entries[index]?.run(),
      );
    } else {
      Alert.alert(
        'Plus d’actions',
        undefined,
        [
          ...entries.map((e) => ({ text: e.label, onPress: e.run })),
          { text: 'Annuler', style: 'cancel' as const },
        ],
      );
    }
  };

  const showMenu = prepared || studio.canRollback;
  const showStepper = prepared && !studio.jobBusy;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: 'Studio',
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Fermer le Studio"
              hitSlop={8}
              style={styles.headerBtn}
            >
              <X size={22} color={t.accentText} />
            </Pressable>
          ),
          headerRight: () =>
            showMenu ? (
              <Pressable
                onPress={openMenu}
                accessibilityRole="button"
                accessibilityLabel="Plus d'actions"
                hitSlop={8}
                style={styles.headerBtn}
              >
                {studio.simulating || studio.rollingBack ? (
                  <ActivityIndicator color={t.accentText} />
                ) : (
                  <EllipsisVertical size={22} color={t.accentText} />
                )}
              </Pressable>
            ) : null,
        }}
      />

      {session && session.references.length > 1 ? (
        <StudioSessionBar
          references={session.references}
          index={session.index}
          busy={dismiss.isPending}
          onNavigate={goTo}
          onDismiss={() => {
            const ref = session.references[session.index];
            if (ref) dismiss.mutate(ref);
          }}
        />
      ) : null}

      <StudioSummary />
      {showStepper ? <StudioStepper /> : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <StudioBody onBackground={close} />
      </ScrollView>

      {showStepper ? (
        <View style={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}>
          <StudioStepFooter />
        </View>
      ) : null}
      <StudioConfirm />
    </View>
  );
}

/** Zone centrale : chargement, erreur, job en cours, brouillon vierge ou étape active. */
function StudioBody({ onBackground }: { onBackground: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  const studio = useStudio();

  if (studio.jobBusy && studio.job) {
    const job = studio.job;
    return (
      <StudioProgress
        steps={Object.fromEntries((job.steps ?? []).map((s) => [s.key, s.status]))}
        stepDefs={job.type === 'DEPLOY' ? DEPLOY_STEP_DEFS : undefined}
        title={STUDIO_JOB_TYPE_LABEL[job.type]}
        subtitle="Collecte des données…"
        queuePosition={job.status === 'QUEUED' ? job.queuePosition : null}
        onBackground={onBackground}
      />
    );
  }
  if (studio.loading && !studio.draft) {
    return <StudioProgress steps={{}} title="Chargement du brouillon" />;
  }
  if (studio.loadError && !studio.draft) {
    return (
      <View style={styles.center}>
        <Text style={[styles.error, { color: t.danger }]}>{studio.loadError}</Text>
        <Button label="Réessayer" variant="outline" onPress={studio.reload} />
      </View>
    );
  }
  if (studio.draft && !studio.draft.preparedAt) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Cette fiche n’a pas encore été préparée</Text>
        <Text style={styles.emptyText}>
          La préparation analyse la fiche, la fiche technique et le marché pour proposer le nom,
          les textes, les attributs, les images, le contenu GEO, les produits associés et les
          catégories.
        </Text>
        <Button
          label="Préparer la fiche"
          loading={studio.jobStarting}
          onPress={() => void studio.startPrepare()}
        />
        {studio.prepareError ? (
          <Text style={[styles.error, { color: t.danger }]}>{studio.prepareError}</Text>
        ) : null}
      </View>
    );
  }

  const ActiveTab = TAB_COMPONENTS[studio.tab];
  return <ActiveTab />;
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  headerBtn: { width: hitTarget - 8, height: hitTarget - 8, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing['3xl'] },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '800', color: t.text, textAlign: 'center' },
  emptyText: { fontSize: fontSize.sm, color: t.textMuted, textAlign: 'center', lineHeight: 20 },
  error: { fontSize: fontSize.xs, textAlign: 'center' },
}));
