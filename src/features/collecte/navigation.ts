import { router } from 'expo-router';

export function openCollecteOrder(reference: string) {
  router.push({ pathname: '/hub/collecte-entrepot/commande/[reference]', params: { reference } });
}

/** Feuille « Historique des étiquettes » d'une commande. */
export function openCollecteHistory(reference: string) {
  router.push({ pathname: '/hub/collecte-entrepot/historique', params: { reference } });
}
