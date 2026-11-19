import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubProductMarketplacesApi } from '@/api/hubProductMarketplaces';
import { hubProductsApi } from '@/api/hubProducts';
import type { UpdateHubProductPayload } from '@/types/hubPricing';
import type {
  HubCreateOfferPayload,
  HubDeployAsinPayload,
  HubEnvelope,
  HubLinkEanPayload,
  HubMarketplaceKey,
  HubUpdateOfferPayload,
} from '@/types/hubProductMarketplaces';

import { productPricingKey } from './useProductPricing';

type Invalidate = 'pricing' | 'header' | 'stock';

const KEYS: Record<Invalidate, (reference: string) => readonly unknown[]> = {
  pricing: productPricingKey,
  header: (reference) => ['hub-product-header', reference],
  stock: (reference) => ['hub-product-stock', reference],
};

/**
 * Le back répond parfois 200 avec `success: false` et un message : c'est un échec à montrer
 * tel quel, pas une réussite.
 */
function assertSuccess(result: HubEnvelope): HubEnvelope {
  if (result?.success === false) {
    throw new ApiError(400, result.message ?? result.error ?? "L'action a échoué.", result);
  }
  return result;
}

/**
 * Actions marketplace de la fiche produit (SUPERADMIN) : disponibilité, nom du vendeur,
 * synchro SKU, lien EAN, offres, déploiement ASIN, retrait forcé, et modification de
 * l'objectif ou de la commission (`PATCH hub-app/products/:ref`). Chaque réussite affiche un
 * toast et recharge les données de la fiche concernées.
 */
export function useMarketplaceMutations(reference: string) {
  const queryClient = useQueryClient();

  const refresh = (invalidate: readonly Invalidate[]) => {
    for (const name of invalidate) {
      void queryClient.invalidateQueries({ queryKey: KEYS[name](reference) });
    }
  };
  const failure = (fallback: string) => (error: unknown) =>
    toast.error(error instanceof ApiError && error.message ? error.message : fallback);

  const setAvailability = useMutation({
    mutationFn: (vars: { marketplace: HubMarketplaceKey; notAvailable: boolean; country?: string }) =>
      hubProductMarketplacesApi
        .setAvailability(reference, vars.marketplace, {
          notAvailable: vars.notAvailable,
          country: vars.country,
        })
        .then(assertSuccess),
    onSuccess: () => {
      toast.success('Disponibilité mise à jour');
      refresh(['pricing', 'header']);
    },
    onError: failure('Impossible de modifier la disponibilité.'),
  });

  const setSellerName = useMutation({
    mutationFn: (vars: { marketplace: HubMarketplaceKey; sellerName: string }) =>
      hubProductMarketplacesApi
        .setSellerName(reference, vars.marketplace, { sellerName: vars.sellerName })
        .then(assertSuccess),
    onSuccess: () => {
      toast.success('Nom du vendeur mis à jour');
      refresh(['pricing']);
    },
    onError: failure('Impossible de modifier le nom du vendeur.'),
  });

  const syncSku = useMutation({
    mutationFn: (marketplace: HubMarketplaceKey) =>
      hubProductMarketplacesApi.syncSku(reference, marketplace).then(assertSuccess),
    onSuccess: (result) => {
      toast.success(result.message || 'SKU synchronisé depuis PrestaShop');
      refresh(['pricing', 'header']);
    },
    onError: failure('Impossible de synchroniser le SKU.'),
  });

  const linkEan = useMutation({
    mutationFn: (vars: { marketplace: HubMarketplaceKey; payload: HubLinkEanPayload }) =>
      hubProductMarketplacesApi.linkEan(reference, vars.marketplace, vars.payload).then(assertSuccess),
    onSuccess: (result, vars) => {
      // L'aperçu (dryRun) n'écrit rien : pas de toast ni de rechargement.
      if (vars.payload.dryRun) return;
      toast.success(result.message || 'Produit lié par EAN');
      refresh(['pricing', 'header']);
    },
    onError: failure('Impossible de lier le produit par EAN.'),
  });

  const createOffer = useMutation({
    mutationFn: (vars: { marketplace: HubMarketplaceKey; payload: HubCreateOfferPayload }) =>
      hubProductMarketplacesApi
        .createOffer(reference, vars.marketplace, vars.payload)
        .then(assertSuccess),
    onSuccess: (result) => {
      toast.success(result.message || 'Offre créée');
      refresh(['pricing', 'header']);
    },
    onError: failure("Impossible de créer l'offre."),
  });

  const updateOffer = useMutation({
    mutationFn: (vars: { marketplace: HubMarketplaceKey; payload: HubUpdateOfferPayload }) =>
      hubProductMarketplacesApi
        .updateOffer(reference, vars.marketplace, vars.payload)
        .then(assertSuccess),
    onSuccess: (result) => {
      toast.success(result.message || 'Offre mise à jour');
      refresh(['pricing']);
    },
    onError: failure("Impossible de mettre à jour l'offre."),
  });

  const previewAsin = useMutation({
    mutationFn: (payload: HubDeployAsinPayload) =>
      hubProductMarketplacesApi.previewAmazonAsin(reference, payload),
    onError: failure("Impossible de contrôler l'ASIN."),
  });

  const deployAsin = useMutation({
    mutationFn: (payload: HubDeployAsinPayload) =>
      hubProductMarketplacesApi.deployAmazonAsin(reference, payload).then(assertSuccess),
    onSuccess: (result) => {
      toast.success(result.message || 'Offre Amazon déployée avec cet ASIN');
      refresh(['pricing', 'header']);
    },
    onError: failure("Impossible de déployer l'offre avec cet ASIN."),
  });

  const forceDelist = useMutation({
    mutationFn: (vars: { marketplace: HubMarketplaceKey; country?: string }) =>
      hubProductMarketplacesApi
        .forceDelist(reference, vars.marketplace, { country: vars.country })
        .then(assertSuccess),
    onSuccess: (result) => {
      toast.success(result.message || 'Offre retirée');
      refresh(['pricing', 'header', 'stock']);
    },
    onError: failure("Impossible de retirer l'offre."),
  });

  /** Objectif HT ou commission d'une marketplace. */
  const updateProduct = useMutation({
    mutationFn: (payload: UpdateHubProductPayload) => hubProductsApi.update(reference, payload),
    onSuccess: () => {
      toast.success('Modification enregistrée');
      refresh(['pricing']);
    },
    onError: failure("Impossible d'enregistrer la modification."),
  });

  return {
    setAvailability,
    setSellerName,
    syncSku,
    linkEan,
    createOffer,
    updateOffer,
    previewAsin,
    deployAsin,
    forceDelist,
    updateProduct,
  };
}
