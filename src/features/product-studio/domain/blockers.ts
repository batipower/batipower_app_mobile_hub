import type { StudioDraft, StudioScores, StudioTab } from '@/types/hubStudio';
import type { StudioDeployCheck, StudioIssue } from '@/types/hubStudioJobs';

/**
 * Assistant de mise en ligne : transforme le contrôle du serveur (`readiness`) en étapes simples,
 * chacune avec ce qu'il faut faire, où cliquer et quel élément mettre en évidence.
 * Le serveur fournit onglet et élément ; la table locale ne sert que si le front est en ligne avant lui.
 */

export type LaunchStepKey = StudioDeployCheck['key'] | 'other';

export interface LaunchStep {
  key: LaunchStepKey;
  done: boolean;
  /** Ce qu'il faut faire, en une phrase (« Ajoutez 1 image sur la fiche »). */
  title: string;
  /** Le chiffre ou la cause (« La fiche a 2 images, il en faut au moins 3. »). */
  detail: string;
  /** Libellé du bouton d'action ; absent quand rien ne se corrige dans le Studio. */
  actionLabel: string | null;
  tab: StudioTab | null;
  /** Élément à entourer dans l'onglet (`data-studio-target`). */
  target: string | null;
}

export type LaunchMode =
  /** Des points empêchent la mise en ligne. */
  | 'blocked'
  /** Produit déjà en ligne : des améliorations restent possibles, rien ne bloque. */
  | 'improve'
  /** Tout est en ordre : on peut déployer. */
  | 'ready';

export interface LaunchGuide {
  mode: LaunchMode;
  /** Tous les critères (faits ou à faire), dans l'ordre de traitement. */
  steps: LaunchStep[];
  /** Les critères restant à traiter. */
  todo: LaunchStep[];
  /** Première étape corrigeable dans le Studio, sinon première étape restante. */
  current: LaunchStep | null;
  doneCount: number;
  total: number;
}

const ORDER: LaunchStepKey[] = ['brand', 'images', 'imageHd', 'attributes', 'geo', 'originality', 'score', 'sellable', 'other'];

const CODE_TO_KEY: Record<string, LaunchStepKey> = {
  BRAND_MISSING: 'brand',
  IMAGES_MISSING: 'images',
  IMAGE_HD_MISSING: 'imageHd',
  ATTRIBUTE_MISSING: 'attributes',
  GEO_MISSING: 'geo',
  GEO_NOT_PUBLISHED: 'geo',
  ORIGINALITY_LOW: 'originality',
  SCORE_TOO_LOW: 'score',
  NOT_SELLABLE: 'sellable',
};

interface LocalCopy {
  title: string;
  detail: string;
  actionLabel: string | null;
  tab: StudioTab | null;
  target: string | null;
}

const LOCAL: Record<LaunchStepKey, LocalCopy> = {
  brand: {
    title: "Le produit n'a pas de marque",
    detail: "Un produit doit obligatoirement être rattaché à une marque.",
    actionLabel: 'Choisir la marque',
    tab: 'contenu',
    target: 'content-brand',
  },
  images: {
    title: 'Ajoutez des images sur la fiche',
    detail: 'Il faut au moins 3 images.',
    actionLabel: 'Ajouter des images',
    tab: 'images',
    target: 'images-add',
  },
  imageHd: {
    title: "L'image principale n'est pas assez grande",
    detail: 'Elle doit dépasser 1024 px sur son plus grand côté.',
    actionLabel: 'Ajouter une image plus grande',
    tab: 'images',
    target: 'images-add',
  },
  attributes: {
    title: 'Renseignez les attributs obligatoires',
    detail: 'Ces caractéristiques sont requises pour cette famille de produits.',
    actionLabel: "Renseigner les attributs",
    tab: 'attributs',
    target: null,
  },
  geo: {
    title: 'Il manque les questions-réponses pour Google et les IA (GEO)',
    detail: 'Le brouillon ne contient ni introduction ni questions-réponses.',
    actionLabel: 'Générer les questions-réponses',
    tab: 'geo',
    target: 'geo-generate',
  },
  originality: {
    title: 'La description ressemble trop à celle du fabricant',
    detail: 'Le texte doit être reformulé pour pouvoir être publié.',
    actionLabel: 'Reformuler la description',
    tab: 'contenu',
    target: 'field:description',
  },
  score: {
    title: 'Le score de la fiche est trop faible',
    detail: 'Les points ci-dessus le font monter.',
    actionLabel: 'Compléter la fiche',
    tab: 'contenu',
    target: null,
  },
  sellable: {
    title: 'Ce produit ne peut pas être mis en ligne',
    detail: "Il est marqué trop fragile ou trop volumineux dans la fiche d'approvisionnement.",
    actionLabel: null,
    tab: null,
    target: null,
  },
  other: {
    title: "Un critère de mise en ligne n'est pas rempli",
    detail: 'Retravaillez la fiche dans le Studio.',
    actionLabel: null,
    tab: null,
    target: null,
  },
};

/** Message de la barrière du site (ancien serveur sans `readiness`) -> critère. */
function keyOfGateMessage(message: string): { key: LaunchStepKey; name?: string } {
  const m = (message || '').trim();
  if (/^Moins de 3 images/i.test(m)) return { key: 'images' };
  if (/^Aucune image HD/i.test(m)) return { key: 'imageHd' };
  const attr = m.match(/^Attribut requis manquant\s*:\s*(.+)$/i);
  if (attr) return { key: 'attributes', name: (attr[1] ?? "").trim() };
  if (/^Singularité insuffisante/i.test(m)) return { key: 'originality' };
  if (/^GEO non publié/i.test(m)) return { key: 'geo' };
  return { key: 'other' };
}

type GeoLike = { geo?: { introHtml?: string; faq?: unknown[] } } | null | undefined;

/** Même règle que le serveur : le GEO validé, sinon celui proposé, compte s'il a une introduction ou des questions. */
function hasGeo(draft: StudioDraft | null | undefined): boolean {
  const geo = (draft?.validated as GeoLike)?.geo ?? (draft?.proposed as GeoLike)?.geo;
  return Boolean(geo?.introHtml?.trim() || (geo?.faq?.length ?? 0) > 0);
}

function todoStep(key: LaunchStepKey, issues: StudioIssue[], check?: StudioDeployCheck): LaunchStep {
  const local = LOCAL[key];
  const first = issues[0];
  const names = key === 'attributes' ? issues.map((i) => attributeName(i)).filter((n): n is string => Boolean(n)) : [];
  const multiple = key === 'attributes' && names.length > 1;

  const title = multiple ? `Renseignez ${names.length} attributs obligatoires` : (first?.title ?? local.title);
  const detail = multiple
    ? `Attributs à renseigner : ${names.join(', ')}.`
    : (first?.detail ?? check?.hint ?? local.detail);
  const tab = first?.tab ?? check?.tab ?? local.tab;
  const target = first?.target ?? check?.target ?? (key === 'attributes' && names[0] ? `attribute:${names[0]}` : local.target);
  const actionLabel = tab ? (first?.actionLabel ?? check?.actionLabel ?? local.actionLabel) : null;
  return { key, done: false, title, detail, actionLabel, tab: tab ?? null, target: tab ? (target ?? null) : null };
}

function attributeName(issue: StudioIssue): string | null {
  const fromTarget = issue.target?.startsWith('attribute:') ? issue.target.slice('attribute:'.length) : '';
  if (fromTarget) return fromTarget;
  const fromTitle = issue.title.match(/:\s*(.+)$/);
  return fromTitle ? (fromTitle[1] ?? "").trim() : null;
}

function doneStep(check: StudioDeployCheck): LaunchStep {
  return { key: check.key, done: true, title: check.label, detail: '', actionLabel: null, tab: null, target: null };
}

function sortSteps(steps: LaunchStep[]): LaunchStep[] {
  return [...steps].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
}

function finalize(mode: LaunchMode, steps: LaunchStep[]): LaunchGuide {
  const sorted = sortSteps(steps);
  const todo = sorted.filter((step) => !step.done);
  const current = todo.find((step) => step.tab) ?? todo[0] ?? null;
  return {
    mode: todo.length === 0 ? 'ready' : mode,
    steps: sorted,
    todo,
    current,
    doneCount: sorted.length - todo.length,
    total: sorted.length,
  };
}

/** Étapes à suivre pour mettre la fiche en ligne, d'après le contrôle du serveur (ou, à défaut, la barrière du site). */
export function buildLaunchGuide(scores: StudioScores | null | undefined, draft: StudioDraft | null | undefined): LaunchGuide {
  const readiness = scores?.readiness ?? null;

  if (readiness) {
    const issues = readiness.issues ?? [];
    const issuesOf = (key: LaunchStepKey) => issues.filter((issue) => (CODE_TO_KEY[issue.code] ?? 'other') === key);

    if (readiness.checks.length > 0) {
      const steps = readiness.checks.map((check) =>
        check.ok ? doneStep(check) : todoStep(check.key, issuesOf(check.key), check),
      );
      return finalize('blocked', steps);
    }

    // Produit déjà en ligne (ou introuvable) : pas de checklist, seulement les constats du serveur.
    const keys = [...new Set(issues.filter((i) => i.severity !== 'info').map((i) => CODE_TO_KEY[i.code] ?? 'other'))];
    return finalize(readiness.ok ? 'improve' : 'blocked', keys.map((key) => todoStep(key, issuesOf(key))));
  }

  const missing = scores?.gate?.missing ?? [];
  const geoReady = hasGeo(draft);
  const grouped = new Map<LaunchStepKey, string[]>();
  for (const message of missing) {
    const { key, name } = keyOfGateMessage(message);
    if (key === 'geo' && geoReady) continue; // l'écriture publie le GEO du brouillon
    grouped.set(key, [...(grouped.get(key) ?? []), ...(name ? [name] : [])]);
  }
  const steps = [...grouped.entries()].map(([key, names]) => {
    const issues: StudioIssue[] = names.map((name) => ({
      code: 'ATTRIBUTE_MISSING',
      severity: 'blocker',
      title: `Attribut obligatoire à renseigner : ${name}`,
      detail: LOCAL.attributes.detail,
      action: '',
      target: `attribute:${name}`,
    }));
    return todoStep(key, issues);
  });
  return finalize('blocked', steps);
}

/** Étapes restantes regroupées par onglet (pour les pastilles rouges de la navigation). */
export function todoByTab(guide: LaunchGuide): Partial<Record<StudioTab, LaunchStep[]>> {
  const byTab: Partial<Record<StudioTab, LaunchStep[]>> = {};
  for (const step of guide.todo) {
    if (!step.tab) continue;
    byTab[step.tab] = [...(byTab[step.tab] ?? []), step];
  }
  return byTab;
}

/** Phrase d'accroche de l'assistant (« encore 2 choses à faire »). */
export function launchHeadline(guide: LaunchGuide): string {
  const n = guide.todo.length;
  if (guide.mode === 'ready') return 'Tout est prêt pour la mise en ligne';
  if (guide.mode === 'improve') return `Produit en ligne : ${n} ${n > 1 ? 'points' : 'point'} à améliorer`;
  return `Pour mettre ce produit en ligne : encore ${n} ${n > 1 ? 'choses' : 'chose'} à faire`;
}
