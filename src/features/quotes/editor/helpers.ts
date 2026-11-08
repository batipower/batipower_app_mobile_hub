import { router } from 'expo-router';

import type { QuoteEditorState } from './editorState';

/** Nom affiché du client du devis (PrestaShop ou prospect). */
export function quoteCustomerName(state: QuoteEditorState): string {
  if (state.clientMode === 'prestashop') {
    const c = state.selectedCustomer;
    if (!c) return '';
    return (
      c.company?.trim() ||
      [c.firstname, c.lastname].filter(Boolean).join(' ').trim() ||
      c.email ||
      `Client #${c.id}`
    );
  }
  const d = state.draft;
  return d.company?.trim() || [d.firstname, d.lastname].filter(Boolean).join(' ').trim() || d.email || '';
}

export function quoteCustomerEmail(state: QuoteEditorState): string {
  return (state.clientMode === 'prestashop' ? state.selectedCustomer?.email : state.draft.email) ?? '';
}

/** Statuts pour lesquels le serveur accepte d'ouvrir une version suivante. */
const REVISABLE = new Set(['ENVOYE', 'ACCEPTE', 'EXPIRE', 'REFUSE']);

export function canStartRevision(state: QuoteEditorState): boolean {
  return (
    state.revisionsEnforced &&
    !!state.quoteId &&
    !state.revisionDraftOpen &&
    REVISABLE.has(state.quoteStatus) &&
    !state.prestashopOrderId
  );
}

export type EditorSheet =
  | 'client'
  | 'produit'
  | 'transport'
  | 'remise'
  | 'ia'
  | 'envoyer'
  | 'commande'
  | 'refus'
  | 'emails'
  | 'version'
  | 'annuler';

/** Feuille de l'éditeur : l'identifiant de la route (`nouveau` ou id) reste celui du segment `[id]`. */
export function openEditorSheet(sheet: EditorSheet, routeId: string) {
  const params = { id: routeId };
  switch (sheet) {
    case 'client':
      return router.push({ pathname: '/hub/devis/[id]/client', params });
    case 'produit':
      return router.push({ pathname: '/hub/devis/[id]/produit', params });
    case 'transport':
      return router.push({ pathname: '/hub/devis/[id]/transport', params });
    case 'remise':
      return router.push({ pathname: '/hub/devis/[id]/remise', params });
    case 'ia':
      return router.push({ pathname: '/hub/devis/[id]/ia', params });
    case 'envoyer':
      return router.push({ pathname: '/hub/devis/[id]/envoyer', params });
    case 'commande':
      return router.push({ pathname: '/hub/devis/[id]/commande', params });
    case 'refus':
      return router.push({ pathname: '/hub/devis/[id]/refus', params });
    case 'emails':
      return router.push({ pathname: '/hub/devis/[id]/emails', params });
    case 'version':
      return router.push({ pathname: '/hub/devis/[id]/version', params });
    case 'annuler':
      return router.push({ pathname: '/hub/devis/[id]/annuler', params });
  }
}

export function openLineSheet(routeId: string, lineKey: string) {
  router.push({ pathname: '/hub/devis/[id]/ligne', params: { id: routeId, k: lineKey } });
}
