/** Catégorie des pushs « Nouvelle vente » : celle de l'extension de contenu iOS (`hub-sale-content`). */
export const HUB_SALE_CATEGORY = 'HUB_SALE';

/** Type porté par `data.type` des pushs de vente (cf. `sale-notification.service.ts` du back). */
export const HUB_SALE_TYPE = 'HUB_SALE';

/** Catégorie des pushs « Devis » (nouvelle demande, devis accepté / payé / refusé). */
export const HUB_QUOTE_CATEGORY = 'HUB_QUOTE';

/** `data.type` du push d'une nouvelle demande de devis (cf. `quote-notification.service.ts` du back). */
export const HUB_QUOTE_REQUEST_TYPE = 'HUB_QUOTE_REQUEST';

/** `data.type` du push d'un événement sur un devis (accepté, payé, refusé). */
export const HUB_QUOTE_EVENT_TYPE = 'HUB_QUOTE_EVENT';

/** Catégorie des pushs « Opportunité » (acceptée, refusée, abandonnée) : carte iOS à l'appui long. */
export const HUB_OPPORTUNITY_CATEGORY = 'HUB_OPPORTUNITY';

/** `data.type` du push d'une résolution d'opportunité (cf. `hub-opportunity-notification.service.ts` du back). */
export const HUB_OPPORTUNITY_EVENT_TYPE = 'HUB_OPPORTUNITY_EVENT';

/** Catégorie des pushs « Produit déployé » : carte iOS à l'appui long. */
export const HUB_DEPLOYMENT_CATEGORY = 'HUB_DEPLOYMENT';

/** `data.type` du push d'un déploiement de produit. */
export const HUB_DEPLOYMENT_TYPE = 'HUB_DEPLOYMENT';
