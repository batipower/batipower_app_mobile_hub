import type { StudioIssue, StudioPreflight, StudioPreflightVerdict } from '@/types/hubStudioJobs';

/**
 * Messages de la relecture du Studio, traduits en français clair pour l'équipe.
 * Les remarques brutes viennent du serveur (règles éditoriales, vérification IA, erreurs de job) :
 * on les reformule en consigne actionnable, sans vocabulaire technique.
 */

/** Remarque éditoriale du brouillon (`editorialFlags`) en phrase claire. */
export function translateEditorialFlag(raw: string): string {
  const flag = (raw ?? '').trim();
  const banned = flag.match(/^tournure interdite\s*:\s*(.+)$/i);
  if (banned) return `Formule trop commerciale (« ${(banned[1] ?? "").trim()} ») : à reformuler`;
  if (/point d'exclamation/i.test(flag)) return "Le texte contient un point d'exclamation : à retirer";
  if (/nom produit répété/i.test(flag)) return 'Le nom du produit revient trop souvent dans le texte';
  if (/matière insuffisante/i.test(flag)) return "Peu d'informations disponibles sur ce produit : le texte reste court";
  if (/cross-?check indisponible/i.test(flag)) {
    return "La vérification automatique des faits n'a pas pu être faite : relisez les caractéristiques";
  }
  return flag ? `Remarque à relire : ${flag}` : 'Remarque à relire';
}

/** Heuristique simple : un texte sans mot français courant est probablement de l'anglais renvoyé par l'IA. */
export function looksFrench(text: string): boolean {
  const t = ` ${(text ?? '').toLowerCase()} `;
  if (/[àâçéèêëîïôùûœ]/.test(t)) return true;
  return /\s(le|la|les|un|une|des|du|de|et|est|sont|pas|dans|pour|avec|sur|ce|cette|qui|que)\s/.test(t);
}

/** Écarts détectés avec les sources : seulement les messages en français, sinon leur nombre. */
export function summarizeCrossCheckIssues(issues: string[] | null | undefined): { texts: string[]; hiddenCount: number } {
  const list = (issues ?? []).filter((i) => i && !/cross-?check indisponible/i.test(i));
  const french = list.filter(looksFrench);
  return { texts: french, hiddenCount: list.length - french.length };
}

/** Erreur technique de préparation : message simple, le détail brut reste disponible pour le support. */
export function friendlyDraftError(raw: string | null | undefined): { message: string; detail: string } | null {
  const detail = (raw ?? '').trim();
  if (!detail) return null;
  if (/budget/i.test(detail)) {
    return { message: "Le budget quotidien d'IA est atteint : relancez la préparation demain ou contactez un administrateur.", detail };
  }
  return { message: 'La préparation a rencontré un problème technique : relancez-la, et prévenez le support si cela se répète.', detail };
}

const FIELD_LABEL: Record<string, string> = {
  name: 'Titre',
  description: 'Description',
  descriptionShort: 'Description courte',
  linkRewrite: 'Adresse de la page',
  metaTitle: 'Méta titre',
  metaDescription: 'Méta description',
  metaKeywords: 'Mots-clés',
};

/** Libellé lisible d'un champ du Studio (clé technique ou libellé déjà en français). */
function fieldLabel(raw: string): string {
  const key = raw.trim();
  return FIELD_LABEL[key] ?? (key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : 'Le champ');
}

/**
 * Anciens messages techniques (« description non écrit (DESCRIPTION_REGRESSION) ») des jobs enregistrés avant
 * les anomalies expliquées : on les traduit à l'affichage pour qu'aucun code ne parvienne à l'équipe.
 */
export function translateLegacyIssueText(raw: string | null | undefined): string {
  const text = (raw ?? '').trim();
  if (!text) return '';
  return text
    .replace(/(?<![\p{L}])\p{L}+\s+non écrit\s*\(\s*DESCRIPTION_REGRESSION\s*\)/giu, () =>
      'La description proposée est moins riche que celle déjà en ligne : la version en ligne est conservée',
    )
    .replace(/(?<![\p{L}])(\p{L}+)\s+non écrit\s*\(\s*HASH_DIVERGENT\s*\)/giu, (_m, field: string) =>
      `${fieldLabel(field)} : version du site non remplacée, elle a été modifiée à la main`,
    )
    .replace(/\(\s*DESCRIPTION_REGRESSION\s*\)/g, ': la description proposée est moins riche que celle en ligne')
    .replace(/\(\s*HASH_DIVERGENT\s*\)/g, ': version du site modifiée à la main')
    .replace(/\(\s*AXIS_REGRESSION\s*\)/g, ': le score de cet axe baisserait')
    .replace(/\b[A-Z]{3,}(?:_[A-Z]{2,})+\b/g, 'cause technique');
}

/** Message d'échec ou d'avertissement d'un job : critères de mise en ligne et erreurs courantes en français clair. */
export function translateJobMessage(raw: string | null | undefined): string {
  const msg = (raw ?? '').trim();
  if (!msg) return '';
  // Toujours passer par la traduction des anciens codes, y compris dans « Déploiement bloqué : … (DESCRIPTION_REGRESSION) ».
  const cleaned = translateLegacyIssueText(msg);
  if (/^Déploiement bloqué\s*:/i.test(cleaned) || /^Déploiement impossible\s*:/i.test(cleaned)) return cleaned;
  if (/^Gate qualité\s*:/i.test(cleaned)) {
    return `Mise en ligne refusée : ${cleaned.replace(/^Gate qualité\s*:\s*/i, '')}`;
  }
  if (/Interrompu/i.test(cleaned)) return 'Le traitement a été interrompu par un redémarrage du serveur : relancez-le.';
  if (/budget/i.test(cleaned)) return "Le budget quotidien d'IA est atteint.";
  if (/^Google Merchant\s*:/i.test(cleaned)) {
    return `Google Merchant à reprendre : ${cleaned.replace(/^Google Merchant\s*:\s*/i, '')}`;
  }
  if (/File indisponible/i.test(cleaned)) return "La file d'attente était indisponible : relancez le traitement.";
  return cleaned;
}

/** Ce qui a posé problème sur un job échoué ou partiel, en français ; `raw` garde le détail pour l'infobulle. */
export function describeJobProblem(job: {
  error: string | null;
  result: { warnings?: string[]; missing?: string[]; issues?: StudioIssue[] } | null;
}): { message: string; raw: string; issues: StudioIssue[] } | null {
  // Anomalies expliquées par le serveur : titres précis, détail et action disponibles pour la carte et le tiroir.
  const issues = (job.result?.issues ?? []).filter((issue) => issue.severity !== 'info' && !issue.autoFixed);
  if (issues.length > 0) {
    return {
      message: issues.map((issue) => issue.title).join(' · '),
      raw: job.error ?? issues.map((issue) => `${issue.title} — ${issue.detail}`).join(' · '),
      issues,
    };
  }
  const missing = (job.result?.missing ?? []).filter(Boolean);
  const raw = job.error ?? job.result?.warnings?.[0] ?? missing.join(' · ');
  if (missing.length > 0) return { message: missing.map(translateJobMessage).join(' · '), raw: raw || missing.join(' · '), issues: [] };
  if (job.error) return { message: translateJobMessage(job.error), raw: job.error, issues: [] };
  const warning = job.result?.warnings?.[0];
  if (warning) return { message: translateJobMessage(warning), raw: warning, issues: [] };
  return null;
}

/** Libellé et teinte d'un verdict de contrôle avant déploiement. */
export const PREFLIGHT_VERDICT_LABEL: Record<StudioPreflightVerdict, string> = {
  READY: 'Prête',
  ATTENTION: 'À relire',
  BLOCKED: 'À corriger',
};

/** Phrase de synthèse d'un contrôle, pour l'en-tête de la section du tiroir. */
export function preflightHeadline(preflight: Pick<StudioPreflight, 'verdict' | 'issues'>): string {
  const issues = Array.isArray(preflight?.issues) ? preflight.issues : [];
  const blockers = issues.filter((issue) => issue.severity === 'blocker').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  if (preflight?.verdict === 'BLOCKED') {
    return `${blockers} point${blockers > 1 ? 's' : ''} à corriger avant de pouvoir déployer`;
  }
  if (preflight?.verdict === 'ATTENTION') {
    return `Déployable, ${warnings} point${warnings > 1 ? 's' : ''} à relire`;
  }
  return 'Prête pour le déploiement : aucun problème détecté';
}
