import type {
  StudioAccessoryProposal,
  StudioApplyLog,
  StudioAttribute,
  StudioBrandProposal,
  StudioCategoryProposal,
  StudioDraft,
  StudioFieldDecision,
  StudioFieldKey,
  StudioFieldReason,
  StudioGeoContent,
  StudioProposedContent,
  StudioStepId,
  StudioTab,
} from '@/types/hubStudio';

/** Score minimal (exclusif) pour mettre un produit en ligne : il faut un score strictement supérieur. */
export const MIN_DEPLOY_SCORE = 55;

/** Étapes du job « Valider et déployer » (mêmes clés que le worker du back). */
export const DEPLOY_STEP_DEFS: readonly { key: string; label: string }[] = [
  { key: 'apply', label: 'Écriture du contenu' },
  { key: 'geo', label: 'Publication GEO' },
  { key: 'publish', label: 'Mise en ligne' },
  { key: 'merchant', label: 'Google Merchant' },
];

/**
 * Récapitulatif « ce qui part où » d'un déploiement : mêmes lignes dans le Studio, la file d'attente
 * et « Recalculer et déployer » (le recalcul du GEO s'ajoute en tête).
 */
export function buildDeployRecap(options: { recalculateGeo?: boolean } = {}): string[] {
  return [
    ...(options.recalculateGeo ? ['Recalcul du GEO (IA) : le brouillon et le score sont mis à jour'] : []),
    'PrestaShop : contenu validé, attributs, catégories et produits associés (annulable)',
    options.recalculateGeo
      ? 'Page du site : GEO (introduction + FAQ) publié, même si un GEO plus complet est déjà en ligne'
      : 'Page du site : GEO (introduction + FAQ) publié',
    'Mise en ligne du produit sur batipower.fr',
    'Google Merchant : fiche déployée',
  ];
}

export function canDeployToSite(score: number | null | undefined): boolean {
  return typeof score === 'number' && score > MIN_DEPLOY_SCORE;
}

export interface StudioFieldDef {
  key: StudioFieldKey;
  label: string;
  /** Clé correspondante dans `proposed` / `validated` côté back. */
  proposedKey: keyof StudioProposedContent;
  kind: 'text' | 'textarea' | 'html';
  group: 'fiche' | 'seo';
  min?: number;
  max?: number;
  hint?: string;
  rows?: number;
}

export const FIELDS: StudioFieldDef[] = [
  { key: 'name', label: 'Nom', proposedKey: 'name', kind: 'text', group: 'fiche' },
  {
    key: 'descriptionShort',
    label: "L'essentiel",
    proposedKey: 'descriptionShort',
    kind: 'textarea',
    group: 'fiche',
    min: 500,
    max: 800,
    hint: 'cible 500–750, max PrestaShop 800',
    rows: 8,
  },
  { key: 'description', label: 'Description', proposedKey: 'descriptionHtml', kind: 'html', group: 'fiche' },
  { key: 'metaTitle', label: 'Meta title', proposedKey: 'metaTitle', kind: 'text', group: 'seo', min: 30, max: 70 },
  {
    key: 'metaDescription',
    label: 'Meta description',
    proposedKey: 'metaDescription',
    kind: 'textarea',
    group: 'seo',
    min: 110,
    max: 160,
    rows: 3,
  },
  { key: 'linkRewrite', label: 'Slug', proposedKey: 'linkRewrite', kind: 'text', group: 'seo' },
  { key: 'metaKeywords', label: 'Meta keywords', proposedKey: 'metaKeywords', kind: 'text', group: 'seo' },
];

export const STEPS: { key: string; label: string }[] = [
  { key: 'facts', label: 'Collecte des faits' },
  { key: 'datasheet', label: 'Lecture fiche technique' },
  { key: 'brand', label: 'Marque' },
  { key: 'search', label: 'Search Console' },
  { key: 'images', label: 'Lecture des images' },
  { key: 'competitor', label: 'Benchmark concurrent' },
  { key: 'generate', label: 'Génération' },
  { key: 'geo', label: 'Contenu GEO' },
  { key: 'evidence', label: 'Validateur evidence' },
  { key: 'editorial', label: 'Variation éditoriale' },
  { key: 'crosscheck', label: 'Cross-check adverse' },
  { key: 'uniqueness', label: 'Singularité' },
  { key: 'score', label: 'Score projeté' },
  { key: 'preflight', label: 'Contrôle avant déploiement' },
];

/** Les images viennent en premier : elles permettent de reconnaître le produit avant de relire le reste. */
export const TABS: { id: StudioTab; label: string }[] = [
  { id: 'images', label: 'Images' },
  { id: 'contenu', label: 'Contenu' },
  { id: 'attributs', label: 'Attributs' },
  { id: 'geo', label: 'GEO' },
  { id: 'associes', label: 'Associés' },
  { id: 'categories', label: 'Catégories' },
];

/** Parcours de relecture : les 6 onglets à valider une à une, puis le déploiement. */
export const STUDIO_STEPS: { id: StudioStepId; label: string }[] = [...TABS, { id: 'deployer', label: 'Déployer' }];

export const DECISION_LABEL: Record<StudioFieldDecision, string> = {
  PENDING: 'À valider',
  ACCEPTED: 'Validé',
  EDITED: 'Modifié',
  REJECTED: 'Refusé',
};

export const MODE_LABEL: Record<string, string> = {
  SKIP: 'Inchangé',
  ADJUST: 'Ajusté',
  GENERATE: 'Généré',
};

// ── Explication des statuts d'un champ ───────────────────────────────────────

/** Ce que veut dire le badge de mode (travail de l'IA sur le champ). */
export const MODE_HELP: Record<string, string> = {
  SKIP: "Le texte actuel est déjà conforme : l'IA l'a recopié sans le modifier.",
  ADJUST: "L'IA est partie du texte actuel et l'a retouché au minimum, sans le réécrire.",
  GENERATE: "Le champ était vide ou écrit par le Studio : l'IA a rédigé une nouvelle version.",
};

/** Ce que veut dire le badge de décision (sort de la proposition au déploiement). */
export const DECISION_HELP: Record<StudioFieldDecision, string> = {
  PENDING: "Aucune décision : la proposition n'est pas encore validée ni refusée.",
  ACCEPTED: 'Proposition validée : elle sera écrite sur le site au déploiement.',
  EDITED: 'Texte modifié par vous : il sera écrit sur le site au déploiement.',
  REJECTED: 'Proposition refusée : la version actuelle du site est conservée.',
};

export type FieldOutcome = 'WRITE' | 'KEEP' | 'DECIDE';

/** Issue d'un champ au déploiement, d'après sa seule décision (seuls ACCEPTED et EDITED sont écrits). */
export function deployOutcome(decision: StudioFieldDecision): { outcome: FieldOutcome; label: string } {
  if (decision === 'ACCEPTED' || decision === 'EDITED') {
    return { outcome: 'WRITE', label: 'La proposition sera écrite sur le site.' };
  }
  if (decision === 'REJECTED') {
    return { outcome: 'KEEP', label: 'La version actuellement en ligne sera conservée.' };
  }
  return { outcome: 'DECIDE', label: 'En attente de votre décision : ce champ ne sera pas écrit tant qu\u2019il n\u2019est pas validé.' };
}

/** Résumé chiffré pour l'ensemble des champs de contenu. */
export function deploySummary(decisions: StudioFieldDecision[]): Record<FieldOutcome, number> {
  const out: Record<FieldOutcome, number> = { WRITE: 0, KEEP: 0, DECIDE: 0 };
  for (const decision of decisions) out[deployOutcome(decision).outcome] += 1;
  return out;
}

/** Libellé de décision qui précise qui l'a prise : « Refusé automatiquement », « Validé par vous »… */
export function decisionLabel(decision: StudioFieldDecision, reason?: StudioFieldReason | null): string {
  const base = DECISION_LABEL[decision];
  if (decision === 'PENDING' || !reason) return base;
  if (reason.source === 'USER') return `${base} par vous`;
  if (decision === 'EDITED') return base;
  return decision === 'ACCEPTED' ? 'Validé automatiquement' : 'Refusé automatiquement';
}

interface CauseHelp {
  why: (confidence?: number) => string;
  advice: string;
}

const percent = (confidence?: number) => (typeof confidence === 'number' ? ` (confiance ${Math.round(confidence * 100)} %)` : '');

/** Pourquoi le système a posé la décision, et que faire. */
export const CAUSE_HELP: Record<NonNullable<StudioFieldReason['cause']>, CauseHelp> = {
  CROSSCHECK_LOW: {
    why: (c) =>
      `La relecture critique de l'IA n'est pas assez sûre de cette fiche${percent(c)} ou a relevé un point à vérifier : par prudence, rien n'est validé tout seul.`,
    advice: "Relisez le texte et comparez-le avec la fiche actuelle. Validez-le s'il est exact, sinon modifiez-le ou recalculez-le.",
  },
  CROSSCHECK_OK: {
    why: (c) => `La relecture critique de l'IA est confiante${percent(c)} et n'a relevé aucun problème : la proposition est validée d'office.`,
    advice: 'Un coup d\u2019œil suffit. Refusez le champ si le texte ne vous convient pas.',
  },
  UNCHANGED: {
    why: () => "Le texte actuel est déjà conforme aux règles : il n'y a rien à remplacer.",
    advice: 'Rien à faire. Validez uniquement si vous voulez quand même écrire la version proposée.',
  },
  MANUAL_CONTENT: {
    why: () => "Ce texte a été saisi ou modifié à la main sur le site : il n'est jamais remplacé automatiquement, pour ne pas écraser un travail humain.",
    advice: "Comparez avec la fiche actuelle. Validez la proposition si elle est meilleure, sinon laissez le champ refusé.",
  },
  SHORT_TOO_SHORT: {
    why: () => "La proposition est trop courte pour le minimum attendu sur ce champ (l'essentiel du produit).",
    advice: 'Recalculez le champ avec une consigne (par exemple « ajoute les dimensions et la garantie ») ou complétez-le à la main.',
  },
  AUTO_ACCEPT_RICHER: {
    why: () => 'La proposition est plus riche et mieux structurée que le texte actuel : elle est validée d\u2019office.',
    advice: "Relisez rapidement. Refusez le champ si le texte actuel vous semble meilleur.",
  },
  AUTO_ACCEPT_GENERATED: {
    why: () => 'La proposition respecte les critères du Studio (longueur, richesse) : elle est validée d\u2019office.',
    advice: 'Relisez rapidement. Refusez le champ si le texte ne vous convient pas.',
  },
  KEYWORDS_PRESENT: {
    why: () => "L'IA a proposé des mots-clés : ils sont validés d'office car peu risqués.",
    advice: 'Retirez ou ajoutez des mots-clés si besoin.',
  },
  PREFLIGHT_REGRESSION: {
    why: () => "Le contrôle avant déploiement a refusé ce champ : la proposition est moins riche que la description déjà en ligne, elle l'appauvrirait.",
    advice: "Gardez la version en ligne, ou retravaillez la proposition puis validez-la : un texte modifié à la main est toujours écrit.",
  },
  PREFLIGHT_MANUAL_SITE: {
    why: () => "Le contrôle avant déploiement a refusé ce champ : la version en ligne a été retouchée à la main depuis la dernière écriture du Studio.",
    advice: 'Gardez la version du site, ou modifiez la proposition puis validez-la pour autoriser le remplacement.',
  },
};

export interface FieldExplanation {
  outcome: FieldOutcome;
  /** Pourquoi le champ est dans cet état. */
  why: string;
  /** Ce qui se passera au déploiement. */
  deploy: string;
  /** Action conseillée (absente quand rien ne la justifie, par exemple un brouillon ancien). */
  advice?: string;
}

/** Texte du bandeau d'un champ : pourquoi, effet au déploiement, conseil. */
export function explainField(
  decision: StudioFieldDecision,
  mode: string,
  reason?: StudioFieldReason | null,
): FieldExplanation {
  const { outcome, label } = deployOutcome(decision);
  const modeHelp = MODE_HELP[mode] ?? '';

  if (reason?.source === 'USER' && decision !== 'PENDING') {
    const who =
      decision === 'REJECTED' ? 'Vous avez refusé' : decision === 'EDITED' ? 'Vous avez modifié' : 'Vous avez validé';
    return {
      outcome,
      why: `${who} ce champ. ${modeHelp}`.trim(),
      deploy: label,
      advice:
        decision === 'REJECTED'
          ? 'Cliquez sur « Valider » pour écrire la proposition, ou sur « Actions » puis « Revenir à la proposition ».'
          : undefined,
    };
  }

  const cause = reason?.cause ? CAUSE_HELP[reason.cause] : undefined;
  if (cause && reason) {
    return { outcome, why: cause.why(reason.confidence), deploy: label, advice: cause.advice };
  }

  return {
    outcome,
    why: modeHelp || DECISION_HELP[decision],
    deploy: label,
    advice: outcome === 'DECIDE' ? 'Relisez le texte puis validez-le ou refusez-le.' : undefined,
  };
}

export const ACCESSORY_REASON_LABEL: Record<StudioAccessoryProposal['reason'], string> = {
  achete_avec: 'Acheté avec',
  meme_gamme: 'Même gamme',
  deja_associe: 'Déjà associé',
};

const fieldByKey = new Map(FIELDS.map((field) => [field.key, field]));

export function fieldDef(key: StudioFieldKey): StudioFieldDef {
  return fieldByKey.get(key) ?? FIELDS[0]!;
}

// ── Lecture du brouillon ─────────────────────────────────────────────────────

export function proposedOf(draft: StudioDraft | null | undefined): StudioProposedContent {
  return draft?.proposed ?? {};
}

function validatedOf(draft: StudioDraft | null | undefined): Partial<StudioProposedContent> {
  return draft?.validated ?? {};
}

function asText(value: unknown): string {
  return value == null ? '' : String(value);
}

/** Proposition d'origine de la génération pour un champ. */
export function rawProposedValue(draft: StudioDraft | null | undefined, field: StudioFieldKey): string {
  return asText(proposedOf(draft)[fieldDef(field).proposedKey]);
}

export function fieldDecision(draft: StudioDraft | null | undefined, field: StudioFieldKey): StudioFieldDecision {
  return (draft?.fieldDecisions?.[field] as StudioFieldDecision | undefined) ?? 'PENDING';
}

/** Valeur actuellement retenue côté serveur (validée si ACCEPTED/EDITED, sinon proposée). */
export function committedValue(draft: StudioDraft | null | undefined, field: StudioFieldKey): string {
  const key = fieldDef(field).proposedKey;
  const decision = fieldDecision(draft, field);
  if (decision === 'EDITED' || decision === 'ACCEPTED') {
    return asText(validatedOf(draft)[key] ?? proposedOf(draft)[key]);
  }
  return asText(proposedOf(draft)[key]);
}

/** Valeur de la fiche PrestaShop actuelle (fait collecté), pour la comparaison. */
export function factValue(draft: StudioDraft | null | undefined, key: string): string {
  const fact = draft?.factSheet?.facts?.find((item) => item.key === key);
  return fact ? asText(fact.value) : '';
}

export function isValidatedDecision(decision: StudioFieldDecision): boolean {
  return decision === 'ACCEPTED' || decision === 'EDITED';
}

export function brandProposalOf(draft: StudioDraft | null | undefined): StudioBrandProposal | null {
  return draft?.brandProposal ?? draft?.proposed?.brandProposal ?? null;
}

export function brandDecisionOf(draft: StudioDraft | null | undefined) {
  return draft?.brandDecision ?? (draft?.fieldDecisions?.brand as string | undefined) ?? null;
}

/**
 * Un produit doit avoir une marque liée (même règle que le back) : déjà rattachée sur le site,
 * ou une marque à rattacher / créer qui a été validée. Proposée seulement, refusée ou absente : non.
 */
export function isBrandLinked(draft: StudioDraft | null | undefined): boolean {
  const proposal = brandProposalOf(draft);
  if (!proposal) return false;
  if (proposal.status === 'ALREADY_ATTACHED') return true;
  return brandDecisionOf(draft) === 'ACCEPTED' && (proposal.status === 'ATTACH' || proposal.status === 'CREATE');
}

export function accessoriesOf(draft: StudioDraft | null | undefined): StudioAccessoryProposal[] {
  return proposedOf(draft).accessoryProposals ?? [];
}

export function categoryProposalOf(draft: StudioDraft | null | undefined): StudioCategoryProposal | null {
  return proposedOf(draft).categoryProposal ?? null;
}

export function geoOf(draft: StudioDraft | null | undefined): StudioGeoContent | undefined {
  return proposedOf(draft).geo;
}

export function geoState(draft: StudioDraft | null | undefined): { ok: boolean; questions: number } {
  const geo = geoOf(draft);
  const questions = geo?.faq?.length ?? 0;
  return { ok: Boolean((geo?.introHtml ?? '').trim()) && questions >= 3, questions };
}

export function attributesOf(draft: StudioDraft | null | undefined): StudioAttribute[] {
  return proposedOf(draft).attributes ?? [];
}

export function serverSelectedAttributes(draft: StudioDraft | null | undefined): string[] {
  return attributesOf(draft)
    .filter((attr) => attr.selected !== false && attr.canonicalName)
    .map((attr) => attr.canonicalName);
}

export function sameNameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const right = new Set(b.map((name) => name.toLowerCase()));
  return a.every((name) => right.has(name.toLowerCase()));
}

export function countValidated(draft: StudioDraft | null | undefined): { done: number; total: number } {
  const done = FIELDS.filter((field) => isValidatedDecision(fieldDecision(draft, field.key))).length;
  return { done, total: FIELDS.length };
}

export function latestRollbackLog(draft: StudioDraft | null | undefined): { id: string } | null {
  const logs: StudioApplyLog[] = draft?.applyLogs ?? [];
  const log = logs.find((item) => item.id && !item.dryRun && !item.rolledBack && item.success !== false);
  return log?.id ? { id: log.id } : null;
}

// ── Texte ────────────────────────────────────────────────────────────────────

export function foldText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const HTML_ENTITIES: [RegExp, string][] = [
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
  [/&#39;|&apos;/g, "'"],
  [/&quot;/g, '"'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
];

function decodeEntities(text: string): string {
  return HTML_ENTITIES.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

/** HTML → texte brut avec retours à la ligne (comparaison et diff). */
export function plainText(html: string): string {
  return decodeEntities((html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ''));
}

/** Texte visible sans balises (compteurs de caractères). */
export function visibleText(html: string): string {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Description structurée (aperçu) ──────────────────────────────────────────

export interface DescriptionSection {
  title?: string;
  bullets: string[];
  specs: { name: string; value: string }[];
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

export function parseDescriptionSections(html: string): DescriptionSection[] {
  if (!html) return [];
  const sections: DescriptionSection[] = [];
  let current: DescriptionSection = { bullets: [], specs: [] };
  let used = false;
  const flush = () => {
    if (used) sections.push(current);
  };
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const inner = match[1] ?? "";
    const line = stripTags(inner);
    if (!line) continue;
    const heading = /text-decoration:\s*underline/i.test(inner) || (/:\s*$/.test(line) && line.length - 1 <= 60);
    if (heading) {
      flush();
      current = { title: line.replace(/:\s*$/, '').trim(), bullets: [], specs: [] };
      used = false;
      continue;
    }
    if (/^[-•–—*]\s*/.test(line)) {
      current.bullets.push(line.replace(/^[-•–—*]\s*/, '').trim());
      used = true;
      continue;
    }
    const sep = line.indexOf(':');
    if (sep > 0 && sep <= 60) {
      const name = line.slice(0, sep).trim();
      const value = line.slice(sep + 1).trim();
      if (name && value) {
        current.specs.push({ name, value });
        used = true;
        continue;
      }
    }
    current.bullets.push(line);
    used = true;
  }
  flush();
  return sections;
}

// ── Attributs ────────────────────────────────────────────────────────────────

const ATTRIBUTE_GROUPS: { id: string; label: string; test: RegExp }[] = [
  {
    id: 'dimensions',
    label: 'Dimensions et poids',
    test: /long|larg|haut|diam|prof|épais|epais|poids|dimension|volume|section|taille/i,
  },
  { id: 'electrique', label: 'Électrique', test: /volt|watt|amp[eè]re|puiss|tens|intens|fr[eé]q|courant|\bip\b/i },
  { id: 'matiere', label: 'Matière et finition', test: /mati[eè]re|mat[eé]riau|color|coul|finit|rev[eê]t|inox|acier|plast/i },
  {
    id: 'perf',
    label: 'Performance',
    test: /d[eé]bit|rendement|effic|capacit|vitesse|temp[eé]r|pression|niveau sonore|bruit|autonomie/i,
  },
];

export function attributeGroup(name: string): { id: string; label: string } {
  return ATTRIBUTE_GROUPS.find((group) => group.test.test(name)) ?? { id: 'autres', label: 'Autres' };
}

export function attributeGroupOrder(id: string): number {
  const index = ATTRIBUTE_GROUPS.findIndex((group) => group.id === id);
  return index === -1 ? ATTRIBUTE_GROUPS.length : index;
}

// ── Statut et récapitulatif d'écriture ───────────────────────────────────────

export type StatusTone = 'sky' | 'green' | 'red' | 'slate';

/** Date de préparation du brouillon (« 13/11 10:00 »), `null` s'il n'est pas préparé. */
export function draftStatusDateLabel(draft: StudioDraft | null | undefined): string | null {
  if (!draft?.preparedAt) return null;
  return new Date(draft.preparedAt).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function draftStatusCopy(draft: StudioDraft | null | undefined): { label: string; tone: StatusTone } | null {
  if (!draft) return null;
  const date = draftStatusDateLabel(draft);
  if (draft.status === 'COLLECTING') return { label: 'Préparation en cours', tone: 'sky' };
  if (draft.status === 'FAILED') {
    return { label: draft.lastError ? `Échec : ${draft.lastError}` : 'Échec', tone: 'red' };
  }
  if (draft.status === 'APPLIED') return { label: date ? `Appliquée le ${date}` : 'Appliquée', tone: 'green' };
  if (draft.status === 'GENERATED' || draft.status === 'IN_REVIEW' || draft.status === 'APPROVED' || draft.preparedAt) {
    return { label: date ? `Fiche préparée le ${date}` : 'Fiche préparée', tone: 'green' };
  }
  return { label: 'Pas encore préparée', tone: 'slate' };
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count > 1 ? pluralForm : singular;
}

/** Décision effective d'un champ en tenant compte des éditions locales non encore enregistrées. */
export function effectiveDecision(
  draft: StudioDraft | null | undefined,
  field: StudioFieldKey,
  edits: Record<string, string>,
): StudioFieldDecision {
  const local = edits[field];
  if (local !== undefined && local !== committedValue(draft, field)) return 'EDITED';
  return fieldDecision(draft, field);
}

export function buildApplyDetails(
  draft: StudioDraft | null | undefined,
  pendingEdits: Record<string, string> = {},
  attributeNames?: string[] | null,
): string[] {
  if (!draft) return [];
  const lines: string[] = [];
  const decisions = FIELDS.map((field) => ({ field, decision: effectiveDecision(draft, field.key, pendingEdits) }));

  const pending = decisions.filter((item) => item.decision === 'PENDING');
  if (pending.length) {
    lines.push(
      `${pending.length} ${plural(pending.length, 'champ non validé', 'champs non validés')} ${plural(
        pending.length,
        'sera ignoré',
        'seront ignorés',
      )} : ${pending.map((item) => item.field.label).join(', ')}.`,
    );
  }
  for (const { field, decision } of decisions) {
    if (decision === 'ACCEPTED') lines.push(`${field.label} — proposition validée`);
    else if (decision === 'EDITED') lines.push(`${field.label} — texte modifié`);
  }
  if (!decisions.some((item) => isValidatedDecision(item.decision))) {
    lines.push('Aucun champ de contenu validé : le texte actuel de la fiche ne sera pas remplacé.');
  }

  const attrCount = attributeNames
    ? attributeNames.filter(Boolean).length
    : attributesOf(draft).filter((attr) => attr.selected !== false && attr.canonicalName).length;
  if (attrCount) lines.push(`${attrCount} ${plural(attrCount, 'attribut retenu', 'attributs retenus')}`);

  const relatedCount = accessoriesOf(draft).filter((item) => item.selected).length;
  if (relatedCount) lines.push(`${relatedCount} ${plural(relatedCount, 'produit associé', 'produits associés')}`);

  const category = categoryProposalOf(draft);
  if (category?.finalIds?.length) {
    const current = new Set(category.currentIds ?? []);
    const finalSet = new Set(category.finalIds);
    const added = category.finalIds.filter((id) => !current.has(id)).length;
    const removed = [...current].filter((id) => !finalSet.has(id)).length;
    if (added) lines.push(`${added} ${plural(added, 'catégorie ajoutée', 'catégories ajoutées')}`);
    if (removed) lines.push(`${removed} ${plural(removed, 'catégorie retirée', 'catégories retirées')}`);
  } else {
    const categoryCount = (category?.items ?? []).filter((item) => item.selected).length;
    if (categoryCount) lines.push(`${categoryCount} ${plural(categoryCount, 'catégorie')} à ajouter`);
  }
  if (category?.applyDefault) lines.push("La catégorie principale sera modifiée : l'URL publique peut changer.");

  const brand = brandProposalOf(draft);
  if (brandDecisionOf(draft) === 'ACCEPTED' && brand && (brand.status === 'ATTACH' || brand.status === 'CREATE')) {
    lines.push(
      brand.status === 'CREATE'
        ? `Création de la marque « ${brand.createName || brand.ebatName || ''} »`
        : `Rattachement de la marque ${brand.match?.name || brand.ebatName || ''}`,
    );
  }

  const geo = geoOf(draft);
  if (geo?.introHtml || (geo?.faq ?? []).length) lines.push('Contenu GEO (introduction et FAQ)');
  if (draft.uniqueness?.blocking) {
    lines.push("La singularité est bloquante : l'écriture sera refusée tant que le texte est trop proche du fabricant.");
  }
  return lines;
}

/** Vues d'image générables par IA (packshot / in-situ) d'un plan d'images. */
export function isGenerableView(item: { viewType?: string; generable?: boolean }): boolean {
  return Boolean(
    item.viewType &&
      item.generable !== false &&
      (item.viewType === 'packshot' || item.viewType.startsWith('in-situ')),
  );
}

/** Recherche Google Images de la référence, pour trouver vite des visuels du produit. */
export function googleImagesUrl(reference: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent((reference || '').trim())}`;
}

/** « valeur unité » sans doublon : l'unité n'est ajoutée que si la valeur ne la contient pas déjà. */
export function attributeDisplay(value: string | number | null | undefined, unit?: string | null): string {
  const text = String(value ?? '').trim();
  const u = (unit ?? '').trim();
  if (!u) return text;
  const folded = foldText(text);
  const foldedUnit = foldText(u);
  const before = folded[folded.length - foldedUnit.length - 1];
  const alreadyThere = folded.endsWith(foldedUnit) && (before === undefined || /[\d\s]/.test(before));
  if (alreadyThere) {
    return text;
  }
  return `${text} ${u}`;
}
