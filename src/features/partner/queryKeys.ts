/**
 * Préfixes de clés de cache du module PARTNER : chaque action invalide son domaine d'un coup
 * (liste, fiche, compteurs de badge).
 */
export const PARTNER_PRODUCTS_KEY = ['partner-products'] as const;
export const PARTNER_PRODUCTS_PENDING_KEY = ['partner-products', 'pending'] as const;
export const partnerProductDetailKey = (reference: string) =>
  ['partner-products', 'detail', reference] as const;
export const partnerProductMessagesKey = (reference: string) =>
  ['partner-products', 'messages', reference] as const;

export const PARTNER_OPPORTUNITIES_KEY = ['partner-opportunities'] as const;
export const partnerOpportunityDetailKey = (uuid: string) =>
  ['partner-opportunities', 'detail', uuid] as const;
export const partnerOpportunityMessagesKey = (uuid: string) =>
  ['partner-opportunities', 'messages', uuid] as const;

export const PARTNER_INTER_AGENCY_KEY = ['partner-inter-agency'] as const;
export const PARTNER_INTER_AGENCY_ORDERS_KEY = ['partner-inter-agency', 'orders'] as const;
export const PARTNER_INTER_AGENCY_AGENCIES_KEY = ['partner-inter-agency', 'agencies'] as const;
export const partnerInterAgencyMessagesKey = (
  orderReference: string,
  warehouse: string,
  channel: string,
) => ['partner-inter-agency', 'messages', orderReference, warehouse, channel] as const;

export const PARTNER_DELIVERY_NOTES_KEY = ['partner-delivery-notes'] as const;
export const partnerDeliveryNoteDetailKey = (uuid: string) =>
  ['partner-delivery-notes', 'detail', uuid] as const;
export const partnerDeliveryNoteMessagesKey = (uuid: string) =>
  ['partner-delivery-notes', 'messages', uuid] as const;
