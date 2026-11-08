import { router } from 'expo-router';

/** Identifiant de l'éditeur pour un devis pas encore créé : `/hub/devis/nouveau`. */
export const NEW_QUOTE_ID = 'nouveau';

/** Pipeline des devis (onglet Devis), quelle que soit la pile courante. */
export function openQuotesHome() {
  router.navigate('/hub/devis');
}

export function openQuote(id: string) {
  router.push({ pathname: '/hub/devis/[id]', params: { id } });
}

export function openNewQuote() {
  openQuote(NEW_QUOTE_ID);
}

export function openQuoteRequest(id: string) {
  router.push({ pathname: '/hub/devis/demande/[id]', params: { id } });
}

export function openRequestRefusal(id: string) {
  router.push({ pathname: '/hub/devis/demande/[id]/refus', params: { id } });
}

/**
 * Ouvre un devis ou une demande depuis l'extérieur (notification) : le pipeline est d'abord
 * mis dessous, pour que « Retour » ramène à la liste et non à l'écran précédent.
 */
export function openQuoteFromLink(target: { quoteId: string } | { requestId: string }) {
  openQuotesHome();
  if ('quoteId' in target) openQuote(target.quoteId);
  else openQuoteRequest(target.requestId);
}
