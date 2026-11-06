import { router } from 'expo-router';

/** Navigation interne à l'onglet Recherche : tout s'empile dans sa pile (retour natif). */

export function openOrder(reference: string) {
  router.push({ pathname: '/hub/recherche/commande/[reference]', params: { reference } });
}

export function openProduct(reference: string) {
  router.push({ pathname: '/hub/recherche/produit/[reference]', params: { reference } });
}

/** Liste complète des commandes : `q` = recherche libre, `produit` = contenant cette référence produit. */
export function openOrdersList(params: { q: string } | { produit: string }) {
  router.push({ pathname: '/hub/recherche/commandes', params });
}
