import type { StudioReviewItem } from '@/types/hubStudioJobs';

import { MIN_DEPLOY_SCORE } from './model';

/** Pourquoi une fiche de la liste ne peut pas être déployée tout de suite (`null` : elle le peut). */
export function deployBlockedReason(item: StudioReviewItem): string | null {
  if (item.busy) return 'Un traitement est déjà en file ou en cours pour cette fiche.';
  // Contrôle préalable : le verdict fait foi, même si la liste de titres est vide.
  if (item.preflight?.verdict === 'BLOCKED') {
    const titles = (item.preflight.issues ?? [])
      .filter((issue) => issue.severity === 'blocker' && !issue.autoFixed)
      .map((issue) => issue.title);
    return titles.length > 0
      ? `Déploiement bloqué : ${titles.join(' · ')}`
      : 'Déploiement bloqué : le contrôle préalable a trouvé des points à corriger.';
  }
  const blockers = item.deployBlockers ?? [];
  if (blockers.length > 0) return `Déploiement bloqué : ${blockers.join(' · ')}`;
  // Pas encore contrôlée, ou back ancien sans contrôle détaillé : garde-fou sur le score.
  if (!item.preflight || item.deployBlockers === undefined) {
    const best = Math.max(item.currentScore ?? 0, item.projectedScore ?? 0);
    if (best <= MIN_DEPLOY_SCORE) {
      return `Score trop faible (${best}) : il doit dépasser ${MIN_DEPLOY_SCORE}. Retravaillez la fiche dans le Studio.`;
    }
  }
  return null;
}
