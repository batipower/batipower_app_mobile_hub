import type { BadgeTone } from '@/components/ui';
import type { HubCustomer, HubOrderPaymentInfo } from '@/types/order';

/**
 * Libellés et tons d'affichage des commandes HUB, portés de
 * `front_externe_batipower/lib/hub/order-display.ts`.
 */

const ORIGIN_LABELS: Record<string, string> = {
  WEBSITE: 'Site',
  AMAZON: 'Amazon',
  MANOMANO: 'ManoMano',
  LEROY_MERLIN: 'Leroy Merlin',
  LEROYMERLIN: 'Leroy Merlin',
  CASTORAMA: 'Castorama',
  CDISCOUNT: 'Cdiscount',
  BRICOMAN: 'Bricoman',
};

const ORIGIN_TONES: Record<string, BadgeTone> = {
  AMAZON: 'amber',
  MANOMANO: 'green',
  LEROY_MERLIN: 'green',
  LEROYMERLIN: 'green',
  CASTORAMA: 'amber',
  CDISCOUNT: 'blue',
  WEBSITE: 'green',
  BRICOMAN: 'red',
};

const WAREHOUSE_LABELS: Record<string, string> = {
  QG_BATIPOWER: 'QG',
  FLEVY: 'Flevy',
  NANCY: 'Nancy',
  DOMBASLE: 'Dombasle',
  FBA_AMAZON: 'FBA Amazon',
};

const WAREHOUSE_ORDER_STATUS_LABELS: Record<string, string> = {
  TODO: 'À traiter',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminé',
};

const MATCHED_FIELD_LABELS: Record<string, string> = {
  reference: 'Réf. commande',
  ebatRef: 'Réf. eBat',
  email: 'Email',
  marketplaceRef: 'Réf. marketplace',
  lastname: 'Nom',
  firstname: 'Prénom',
  phone: 'Téléphone',
  mobile: 'Mobile',
  noSuivi: 'N° de suivi',
  referenceFlevy: 'Réf. Flevy',
  referenceNancy: 'Réf. Nancy',
  referenceDombasle: 'Réf. Dombasle',
  productRef: 'Réf. produit',
};

const CANCELLATION_LABELS: Record<string, string> = {
  PENDING: 'Annulation en attente',
  APPROVED: 'Annulation validée',
  REJECTED: 'Annulation refusée',
  CANCELLED: 'Demande retirée',
};

const RETURN_LABEL_STATUS_LABELS: Record<string, string> = {
  READY_TO_COLLECT: 'Prêt à collecter',
  COLLECTED: 'Collecté',
  RECEIVED: 'Reçu',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
  NEW_PRODUCT_SENT: 'Renvoi effectué',
  REFUND_PROCESSED: 'Remboursé',
};

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  REJECTED: 'Rejeté',
};

const RELATED_KIND_LABELS = {
  SPLIT: 'Split',
  PS_SIBLING: 'Panier scindé',
  RESEND: 'Renvoi',
} as const;

function originKey(origin: string | null | undefined): string {
  return (origin ?? '').toUpperCase().replace(/[\s-]+/g, '_');
}

/** `SNAKE_CASE` → « Snake case » : repli lisible quand un code n'a pas de libellé connu. */
export function humanizeCode(code: string | null | undefined): string {
  if (!code) return '—';
  const text = code.replace(/_+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function originLabel(origin: string | null | undefined): string {
  if (!origin) return '—';
  return ORIGIN_LABELS[originKey(origin)] ?? origin;
}

export function originTone(origin: string | null | undefined): BadgeTone {
  return ORIGIN_TONES[originKey(origin)] ?? 'neutral';
}

export function warehouseLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return WAREHOUSE_LABELS[code] ?? humanizeCode(code);
}

export function warehouseOrderStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return WAREHOUSE_ORDER_STATUS_LABELS[status] ?? humanizeCode(status);
}

/** Libellé du champ qui a fait remonter une commande (« Téléphone », « N° de suivi »…). */
export function matchedFieldLabel(field: string): string {
  if (field.startsWith('productReference:')) return 'Réf. produit';
  if (field.startsWith('sku')) return 'SKU';
  if (field.startsWith('returnLabelNoSuivi:')) return 'Suivi retour';
  if (field.startsWith('marketplaceReturnTracking:')) return 'Retour marketplace';
  return MATCHED_FIELD_LABELS[field] ?? field;
}

/** Libellés distincts, dans l'ordre, des champs correspondants (plusieurs peuvent se recouper). */
export function matchedFieldLabels(fields: readonly string[]): string[] {
  return [...new Set(fields.map(matchedFieldLabel))];
}

/** Ton d'un statut de commande, par mots-clés (les statuts sont des libellés PrestaShop en français). */
export function orderStatusTone(status: string | null | undefined): BadgeTone {
  const value = (status ?? '').toLowerCase();
  if (!value) return 'neutral';
  if (
    value.includes('livr') ||
    value === 'done' ||
    value.includes('expédi') ||
    value.includes('expedi')
  ) {
    return 'green';
  }
  if (value.includes('attente') || value === 'todo') return 'amber';
  if (
    value.includes('annul') ||
    value.includes('rembours') ||
    value.includes('refus') ||
    value.includes('error')
  ) {
    return 'red';
  }
  if (value.includes('cours') || value === 'in_progress') return 'blue';
  return 'neutral';
}

/** Ton d'un statut de paiement (« Paiement accepté », « En attente de paiement », « Remboursé »…). */
export function paymentStatusTone(status: string | null | undefined): BadgeTone {
  const value = (status ?? '').toLowerCase();
  if (!value) return 'neutral';
  if (
    value.includes('rembours') ||
    value.includes('refus') ||
    value.includes('erreur') ||
    value.includes('error') ||
    value.includes('échou') ||
    value.includes('echou') ||
    value.includes('annul')
  ) {
    return 'red';
  }
  if (value.includes('attente') || value.includes('partiel')) return 'amber';
  if (value.includes('pay') || value.includes('accept') || value.includes('valid')) return 'green';
  return 'neutral';
}

export function cancellationLabel(status: string | null | undefined): string {
  if (!status) return "Demande d'annulation";
  return CANCELLATION_LABELS[status] ?? status;
}

export function returnLabelStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return RETURN_LABEL_STATUS_LABELS[status] ?? humanizeCode(status);
}

export function returnLabelStatusTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case 'REFUND_PROCESSED':
      return 'green';
    case 'DELIVERED':
    case 'COLLECTED':
      return 'blue';
    case 'NEW_PRODUCT_SENT':
      return 'neutral';
    case 'CANCELLED':
      return 'red';
    default:
      return 'amber';
  }
}

export function disputeStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return DISPUTE_STATUS_LABELS[status] ?? humanizeCode(status);
}

export function disputeStatusTone(status: string | null | undefined): BadgeTone {
  if (status === 'RESOLVED') return 'green';
  if (status === 'REJECTED') return 'red';
  return 'amber';
}

export function relatedKindLabel(kind: keyof typeof RELATED_KIND_LABELS): string {
  return RELATED_KIND_LABELS[kind] ?? humanizeCode(kind);
}

export function customerName(
  customer: Pick<HubCustomer, 'firstname' | 'lastname'> | null | undefined,
): string {
  const name = [customer?.firstname, customer?.lastname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return name || 'Client inconnu';
}

/** « 54000 Nancy » ; chaîne vide si ni code postal ni ville. */
export function customerLocation(
  customer: Pick<HubCustomer, 'zipcode' | 'city'> | null | undefined,
): string {
  return [customer?.zipcode, customer?.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

const WALLET_LABELS: Record<string, string> = {
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

/**
 * Mode de paiement : moyen précis (Apple Pay, PayPal, libellé PrestaShop…) et carte
 * utilisée (« Visa •••• 4242 »). `null` si l'information n'est pas disponible.
 */
export function paymentMethodLabel(info: HubOrderPaymentInfo | null | undefined): string | null {
  const payment = info?.payment;
  if (!payment) return null;

  const wallet = payment.wallet
    ? (WALLET_LABELS[payment.wallet] ?? payment.wallet.replace(/_/g, ' '))
    : null;

  let title: string | null = null;
  if (payment.provider === 'PAYPAL') title = 'PayPal';
  else if (payment.label?.trim()) title = payment.label.trim();
  else if (wallet) title = wallet;
  else if (payment.cardBrand || payment.cardLast4) title = 'Carte bancaire';
  if (!title) return null;

  const card = [payment.cardBrand?.trim(), payment.cardLast4 ? `•••• ${payment.cardLast4}` : null]
    .filter(Boolean)
    .join(' ');
  return card ? `${title} · ${card}` : title;
}
