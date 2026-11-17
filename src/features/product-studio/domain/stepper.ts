import type { StudioStepId, StudioTab } from '@/types/hubStudio';

/**
 * Fil d'étapes de la fiche site : de la préparation IA à la mise en ligne.
 * Fonction pure (aucune dépendance au contexte React) : le composant lui fournit l'état du Studio.
 */

export type StepperStepId = 'preparation' | StudioStepId | 'en-ligne';
export type StepperPhase = 'prepare' | 'review' | 'launch';

export type StepperState =
  /** Étape terminée (validée, préparée, en ligne). */
  | 'done'
  /** Étape à traiter. */
  | 'todo'
  /** Traitement en cours côté serveur. */
  | 'running'
  | 'failed'
  /** Pas accessible tant que les étapes précédentes ne sont pas faites. */
  | 'locked'
  /** Déployer : tout est validé, on peut lancer. */
  | 'ready';

export const PHASE_LABEL: Record<StepperPhase, string> = {
  prepare: 'Préparer',
  review: 'Relire et valider',
  launch: 'Lancer',
};

export interface StepperJobInput {
  type: 'PREPARE' | 'DEPLOY';
  status: string;
  /** Libellé de la sous-étape en cours, si connu. */
  currentLabel?: string | null;
}

export interface StepperInput {
  /** Étapes de relecture dans l'ordre (les onglets du Studio). */
  reviewSteps: readonly { id: StudioTab; label: string }[];
  /** Onglet affiché. */
  tab: StudioStepId;
  preparedAt: string | null;
  /** Date de préparation déjà formatée, pour l'infobulle. */
  preparedLabel?: string | null;
  /** Statut du brouillon (`APPLIED`, `FAILED`...). */
  draftStatus: string | null;
  validations: Partial<Record<StudioTab, unknown>> | null;
  /** Compteur affiché sur chaque étape de relecture (`4/6`, `OK`...). */
  badges: Partial<Record<StudioTab, { text: string; warn: boolean }>>;
  /** Points de l'assistant de mise en ligne à traiter dans chaque étape. */
  todoCounts: Partial<Record<StudioTab, number>>;
  guideMode: 'blocked' | 'improve' | 'ready';
  allStepsValidated: boolean;
  canDeploy: boolean;
  /** Dernier job connu (préparation ou déploiement), en cours ou terminé. */
  job: StepperJobInput | null;
}

export interface StepperSegment {
  id: StepperStepId;
  label: string;
  phase: StepperPhase;
  /** Rang d'affichage, à partir de 1. */
  index: number;
  state: StepperState;
  /** Onglet actuellement affiché. */
  active: boolean;
  /** `null` : étape non navigable (Préparation IA, En ligne). */
  tab: StudioStepId | null;
  /** Compteur discret (relecture uniquement). */
  badge: string | null;
  badgeWarn: boolean;
  /** Points de l'assistant à traiter dans cette étape. */
  todoCount: number;
  /** Les points bloquent la mise en ligne (rouge) plutôt que de l'améliorer (ambre). */
  blocking: boolean;
  /** Déployer prêt et tout est en ordre : à mettre en évidence. */
  highlight: boolean;
  hint: string;
}

const isActive = (status: string | undefined) => status === 'QUEUED' || status === 'RUNNING';

export function buildStudioStepper(input: StepperInput): StepperSegment[] {
  const prepared = Boolean(input.preparedAt);
  const job = input.job;
  const prepareRunning = job?.type === 'PREPARE' && isActive(job.status);
  const deployRunning = job?.type === 'DEPLOY' && isActive(job.status);
  const applied = input.draftStatus === 'APPLIED';

  const segments: StepperSegment[] = [];
  const push = (segment: Omit<StepperSegment, 'index' | 'active'>) =>
    segments.push({ ...segment, index: segments.length + 1, active: segment.tab !== null && segment.tab === input.tab });

  // 1. Préparation IA
  let prepareState: StepperState = 'todo';
  let prepareHint = 'La préparation analyse la fiche et propose images, textes, attributs, GEO, associés et catégories';
  if (prepareRunning) {
    prepareState = 'running';
    prepareHint = job?.status === 'QUEUED' ? 'Préparation en file d\u2019attente' : (job?.currentLabel ?? 'Préparation en cours');
  } else if (prepared) {
    prepareState = 'done';
    prepareHint = input.preparedLabel ? `Fiche préparée le ${input.preparedLabel}` : 'Fiche préparée';
  } else if (input.draftStatus === 'FAILED' || (job?.type === 'PREPARE' && job.status === 'FAILED')) {
    prepareState = 'failed';
    prepareHint = 'La préparation a échoué : relancez-la depuis l\u2019en-tête';
  }
  push({
    id: 'preparation',
    label: 'Préparation IA',
    phase: 'prepare',
    state: prepareState,
    tab: null,
    badge: null,
    badgeWarn: false,
    todoCount: 0,
    blocking: false,
    highlight: false,
    hint: prepareHint,
  });

  // 2 à 7. Relecture
  for (const item of input.reviewSteps) {
    const validated = Boolean(input.validations?.[item.id]);
    const todoCount = prepared ? (input.todoCounts[item.id] ?? 0) : 0;
    const blocking = todoCount > 0 && input.guideMode === 'blocked';
    const badge = input.badges[item.id];
    push({
      id: item.id,
      label: item.label,
      phase: 'review',
      state: !prepared ? 'locked' : validated ? 'done' : 'todo',
      tab: prepared ? item.id : null,
      badge: prepared ? (badge?.text ?? null) : null,
      badgeWarn: Boolean(badge?.warn),
      todoCount,
      blocking,
      highlight: false,
      hint: !prepared ? 'Préparez d\u2019abord la fiche' : validated ? 'Étape validée' : 'Étape à valider',
    });
  }

  // 8. Déployer
  const deployReady = prepared && input.allStepsValidated;
  const deployHighlight = deployReady && input.guideMode === 'ready' && input.canDeploy && !deployRunning;
  push({
    id: 'deployer',
    label: 'Déployer',
    phase: 'launch',
    state: deployRunning || applied ? 'done' : deployReady ? 'ready' : 'locked',
    tab: prepared ? 'deployer' : null,
    badge: null,
    badgeWarn: false,
    todoCount: 0,
    blocking: false,
    highlight: deployHighlight,
    hint: deployReady ? 'Tout est validé : lancez le déploiement' : 'Validez d\u2019abord toutes les étapes',
  });

  // 9. En ligne
  let liveState: StepperState = prepared ? 'todo' : 'locked';
  let liveHint = 'Le produit sera écrit sur PrestaShop puis mis en ligne';
  if (deployRunning) {
    liveState = 'running';
    liveHint = job?.status === 'QUEUED' ? 'Déploiement en file d\u2019attente' : (job?.currentLabel ?? 'Déploiement en cours');
  } else if (job?.type === 'DEPLOY' && job.status === 'FAILED') {
    liveState = 'failed';
    liveHint = 'Le dernier déploiement a échoué';
  } else if (applied) {
    liveState = 'done';
    liveHint = job?.type === 'DEPLOY' && job.status === 'PARTIAL' ? 'En ligne, une étape est à vérifier' : 'Produit en ligne';
  }
  push({
    id: 'en-ligne',
    label: 'En ligne',
    phase: 'launch',
    state: liveState,
    tab: null,
    badge: null,
    badgeWarn: liveState === 'failed',
    todoCount: 0,
    blocking: false,
    highlight: false,
    hint: liveHint,
  });

  return segments;
}

/** Avancement global du fil, en pourcentage d'étapes terminées. */
export function stepperProgress(segments: readonly Pick<StepperSegment, 'state'>[]): number {
  if (segments.length === 0) return 0;
  return Math.round((segments.filter((segment) => segment.state === 'done').length / segments.length) * 100);
}

export type SubstepStatus = 'waiting' | 'running' | 'done' | 'skipped' | 'error';

export interface StepperSubstep {
  key: string;
  label: string;
  status: SubstepStatus;
}

/**
 * Sous-étapes du déploiement (écriture, GEO, mise en ligne, Google Merchant) pour le popover « En ligne » :
 * l'avancement du dernier job de déploiement, sinon tout est fait (fiche appliquée) ou en attente.
 */
export function deploySubsteps(
  defs: readonly { key: string; label: string }[],
  job: { type: string; steps: readonly { key: string; status: string }[] | null } | null,
  applied: boolean,
): StepperSubstep[] {
  const byKey = job?.type === 'DEPLOY' ? new Map((job.steps ?? []).map((step) => [step.key, step.status])) : null;
  return defs.map((def) => {
    const raw = byKey?.get(def.key);
    const status: SubstepStatus =
      raw === 'done' || raw === 'skipped' || raw === 'running' || raw === 'error' || raw === 'waiting'
        ? raw
        : applied && !byKey
          ? 'done'
          : 'waiting';
    return { key: def.key, label: def.label, status };
  });
}
