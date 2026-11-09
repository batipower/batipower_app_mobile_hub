import type { BadgeTone } from '@/components/ui/Badge';
import type { HubPalletQuote, HubPalletQuoteStatus } from '@/types/hubPalletFlow';
import type { HubOrder } from '@/types/order';

/** Libellé et teinte du statut du flux palette d'une commande (`null` = flux classique). */
export function palletFlowStatusView(status: string | null | undefined): {
  label: string;
  tone: BadgeTone;
} {
  switch (status) {
    case 'CANDIDATE':
      return { label: 'À arbitrer', tone: 'amber' };
    case 'QUOTE_REQUESTED':
      return { label: 'Prix palette demandé', tone: 'blue' };
    case 'ACCEPTED':
      return { label: 'Enlèvement palette accepté', tone: 'green' };
    case 'REFUSED':
      return { label: 'Prix refusé', tone: 'red' };
    default:
      return { label: 'Flux classique', tone: 'neutral' };
  }
}

const QUOTE_STATUS_LABELS: Record<HubPalletQuoteStatus, string> = {
  PENDING: 'En attente de réponse',
  ANSWERED: 'Prix reçu',
  ACCEPTED: 'Acceptée',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
};

export function quoteStatusLabel(status: HubPalletQuoteStatus): string {
  return QUOTE_STATUS_LABELS[status] ?? status;
}

export function quoteStatusTone(status: HubPalletQuoteStatus): BadgeTone {
  switch (status) {
    case 'ANSWERED':
      return 'blue';
    case 'ACCEPTED':
    case 'SHIPPED':
    case 'DELIVERED':
      return 'green';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'red';
    default:
      return 'amber';
  }
}

/** Commande déjà partie : plus d'arbitrage possible. */
export function isOrderShipped(order: HubOrder): boolean {
  return Boolean(order.dateExpedie || order.warehouseOrder?.noSuivi);
}

/** Les deux décisions (demander le prix palette / flux classique) ne valent que pour un candidat non expédié. */
export function canArbitrate(order: HubOrder): boolean {
  return order.palletFlowStatus === 'CANDIDATE' && !isOrderShipped(order);
}

/** Devis qui porte le prix à comparer : réponse reçue, sinon devis accepté / expédié / livré. */
export function quoteToCompare(quotes: HubPalletQuote[]): HubPalletQuote | null {
  return (
    quotes.find((q) => q.status === 'ANSWERED' && q.quotedPriceHT != null) ??
    quotes.find(
      (q) =>
        q.quotedPriceHT != null &&
        (q.status === 'ACCEPTED' || q.status === 'SHIPPED' || q.status === 'DELIVERED'),
    ) ??
    null
  );
}
