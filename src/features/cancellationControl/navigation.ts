import { router } from 'expo-router';

/** Navigation interne à la page Contrôle annulations (menu) : tout s'empile dans sa pile. */

/** Fiche de la commande (lecture seule). */
export function openCancellationOrder(reference: string) {
  router.push({ pathname: '/hub/controle-annulations/commande/[reference]', params: { reference } });
}

/** Feuille de saisie du commentaire pour ignorer une alerte ; `label` = référence affichée. */
export function openCancellationIgnore(id: string, label: string) {
  router.push({ pathname: '/hub/controle-annulations/ignorer', params: { id, label } });
}
