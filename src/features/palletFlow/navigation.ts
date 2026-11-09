import { router } from 'expo-router';

/** Liste des candidats palette (entrée « Candidats palette » du menu). */
export function openPalletCandidates() {
  router.push('/hub/candidats-palette');
}

/** Page d'arbitrage d'une commande candidate (depuis la liste). */
export function openPalletCandidateFromList(reference: string) {
  router.push({ pathname: '/hub/candidats-palette/[reference]', params: { reference } });
}

/**
 * Page d'arbitrage d'une commande, ouverte depuis le push « Commande à arbitrer ». `navigate`
 * d'abord : à froid, la pile contient ainsi la liste sous la fiche, et le retour y mène.
 */
export function openPalletCandidate(reference: string) {
  router.navigate('/hub/candidats-palette');
  router.push({ pathname: '/hub/candidats-palette/[reference]', params: { reference } });
}
