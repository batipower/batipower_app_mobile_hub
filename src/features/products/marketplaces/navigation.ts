import { router } from 'expo-router';

import type { HubMarketplaceKey } from '@/types/hubProductMarketplaces';

/** Champ modifiable depuis la feuille « champ » : objectif HT, commission ou nom du vendeur. */
export type MarketplaceField = 'objective' | 'commission' | 'seller';

type Target = { reference: string; marketplace: HubMarketplaceKey; country: string };

/** Création (`create`) ou mise à jour (`update`) d'une offre. */
export function openOfferSheet(target: Target & { mode: 'create' | 'update' }) {
  router.push({ pathname: '/hub/recherche/produit/offre', params: target });
}

export function openFieldSheet(target: Target & { field: MarketplaceField }) {
  router.push({ pathname: '/hub/recherche/produit/champ', params: target });
}

export function openLinkEanSheet(target: Target) {
  router.push({ pathname: '/hub/recherche/produit/lier-ean', params: target });
}

/** Déploiement d'une offre Amazon sur un ASIN (aperçu puis création). */
export function openAsinSheet(reference: string) {
  router.push({ pathname: '/hub/recherche/produit/asin', params: { reference } });
}
