import { router } from 'expo-router';

import type { InterAgencyChannel } from '@/types/partnerInterAgency';

/** Ouvre la feuille de menu du module PARTNER (mi-écran, par-dessus les onglets). */
export function openPartnerMenu() {
  router.push('/partner/menu');
}

// Produits

export function openProduct(reference: string) {
  router.push({ pathname: '/partner/produits/produit/[reference]', params: { reference } });
}

export function openProductConversation(reference: string) {
  router.push({ pathname: '/partner/produits/conversation/[reference]', params: { reference } });
}

export function openProductFilters() {
  router.push('/partner/produits/filtres');
}

export function openProductBrandPicker() {
  router.push('/partner/produits/marque');
}

// Opportunités

export function openOpportunity(uuid: string) {
  router.push({ pathname: '/partner/opportunites/opportunite/[uuid]', params: { uuid } });
}

/**
 * Ouvre une opportunité depuis l'extérieur (notification) : la liste des opportunités est d'abord
 * mise dessous, pour que « Retour » ramène à la liste et non à l'écran précédent.
 */
export function openOpportunityFromLink(uuid: string) {
  router.navigate('/partner/opportunites');
  openOpportunity(uuid);
}

export function openOpportunityConversation(uuid: string) {
  router.push({ pathname: '/partner/opportunites/conversation/[uuid]', params: { uuid } });
}

export function openOpportunityFilters() {
  router.push('/partner/opportunites/filtres');
}

export function openOpportunityBrandPicker() {
  router.push('/partner/opportunites/marque');
}

// Inter-agences

export function openInterAgencyOrder(reference: string, warehouse: string) {
  router.push({
    pathname: '/partner/inter-agences/commande/[reference]',
    params: { reference, warehouse },
  });
}

export function openInterAgencyConversation(
  reference: string,
  warehouse: string,
  channel: InterAgencyChannel,
) {
  router.push({
    pathname: '/partner/inter-agences/conversation/[reference]',
    params: { reference, warehouse, channel },
  });
}

export function openInterAgencyFilters() {
  router.push('/partner/inter-agences/filtres');
}

/** Feuille « Réalisée » : agences concernées, n° d'inter-agence et commentaire. */
export function openInterAgencyDone(reference: string, warehouse: string) {
  router.push({ pathname: '/partner/inter-agences/realisee', params: { reference, warehouse } });
}

/** Feuille « Impossible d'honorer » : motif et commentaire. */
export function openInterAgencyImpossible(reference: string, warehouse: string) {
  router.push({ pathname: '/partner/inter-agences/impossible', params: { reference, warehouse } });
}

// BL à corriger

export function openDeliveryNote(uuid: string) {
  router.push({ pathname: '/partner/bl/bon/[uuid]', params: { uuid } });
}

export function openDeliveryNoteConversation(uuid: string) {
  router.push({ pathname: '/partner/bl/conversation/[uuid]', params: { uuid } });
}

export function openDeliveryNoteFilters() {
  router.push('/partner/bl/filtres');
}

export function openDeliveryNoteBrandPicker() {
  router.push('/partner/bl/marque');
}
