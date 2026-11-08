import { router } from 'expo-router';

import { dismissSheetThen } from '@/components/sheet/dismissSheet';

import type { StagingFilters } from '@/types/hubProductAnalyzer';

/** Navigation interne du Product Analyzer (menu Pilotage) : tout s'empile dans sa pile. */

export type PaPickerKind =
  | 'brands'
  | 'tags'
  | 'distributors'
  | 'affaires'
  | 'stock'
  | 'stock-suppliers'
  | 'bulk-affaire'
  | 'bulk-dep'
  | 'bulk-launch'
  | 'edit-tags'
  | 'bulk-actions'
  | 'launch-affaire'
  | 'reserve-affaire'
  | 'item-actions';

export function openPaFiche(uuid: string, opportunityUuid?: string | null) {
  router.push({
    pathname: '/hub/product-analyzer/fiche/[uuid]',
    params: { uuid, ...(opportunityUuid ? { opportunityUuid } : {}) },
  });
}

/** Remplace l'écran « live » par la fiche du produit analysé. */
export function replaceWithPaFiche(uuid: string, opportunityUuid?: string | null) {
  router.replace({
    pathname: '/hub/product-analyzer/fiche/[uuid]',
    params: { uuid, ...(opportunityUuid ? { opportunityUuid } : {}) },
  });
}

export function openPaLive() {
  router.push('/hub/product-analyzer/live');
}

export function replaceWithPaLive() {
  router.replace('/hub/product-analyzer/live');
}

export function openPaQueue() {
  router.push('/hub/product-analyzer/file');
}

export function replaceWithPaQueue() {
  router.replace('/hub/product-analyzer/file');
}

/** Paramètres d'entrée de la feuille « Analyser » (lien profond, opportunité d'origine). */
export type PaLauncherParams = {
  ean?: string;
  code?: string;
  obtainedPriceHT?: string;
  opportunityUuid?: string;
  mode?: 'ean' | 'ebat' | 'manufacturer' | 'reserve';
};

export function openPaLauncher(params: PaLauncherParams = {}) {
  router.push({ pathname: '/hub/product-analyzer/lancer', params });
}

export function openPaScan() {
  router.push('/hub/product-analyzer/scan');
}

export function openPaFilters() {
  router.push('/hub/product-analyzer/filtres');
}

export function openPaSort() {
  router.push('/hub/product-analyzer/tri');
}

export function openPaPicker(kind: PaPickerKind, params: { uuid?: string; mode?: string } = {}) {
  router.push({ pathname: '/hub/product-analyzer/choix/[kind]', params: { kind, ...params } });
}

/** Remplace la feuille courante par une feuille de choix (enchaînement sans empiler). */
export function replacePaPicker(kind: PaPickerKind, params: { uuid?: string; mode?: string } = {}) {
  router.replace({ pathname: '/hub/product-analyzer/choix/[kind]', params: { kind, ...params } });
}

export function openPaAffaire(id: string) {
  router.push({ pathname: '/hub/product-analyzer/affaire/[id]', params: { id } });
}

export type PaNegoSource = 'selection' | 'filter' | 'item';

/** Assistant de négociation : sélection de l'historique, tout le filtre, ou un seul produit. */
export function openPaNego(source: PaNegoSource, uuid?: string) {
  router.push({ pathname: '/hub/product-analyzer/negociation', params: { source, ...(uuid ? { uuid } : {}) } });
}

export type PaEditKind =
  | 'weight'
  | 'brand'
  | 'ean'
  | 'affaire'
  | 'nego-price'
  | 'launch-from-staging'
  | 'marketplaces'
  | 'dep'
  | 'supplier-codes'
  | 'affaire-brand'
  | 'new-affaire';

export function openPaEdit(kind: PaEditKind, params: Record<string, string> = {}) {
  router.push({ pathname: '/hub/product-analyzer/editer/[kind]', params: { kind, ...params } });
}

/** Ouvre l'historique avec des filtres précis (ex. « voir les produits de l'affaire »). */
export function backToHistory() {
  if (router.canGoBack()) router.dismissTo('/hub/product-analyzer');
  else router.replace('/hub/product-analyzer');
}

export type { StagingFilters };

/** Voir `dismissSheetThen` : fermeture de la feuille, puis action une fois l'animation finie. */
export const dismissThen = dismissSheetThen;
