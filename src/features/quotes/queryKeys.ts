import type { SegmentId } from './pipeline';

/**
 * Clés de cache des devis clients. Le préfixe commun `QUOTES_ROOT_KEY` sert à tout invalider
 * d'un coup (notification reçue, action réussie), comme `['hub-customer-quotes']` côté web.
 */
export const QUOTES_ROOT_KEY = ['hub-customer-quotes'] as const;
export const QUOTES_PENDING_KEY = ['hub-customer-quotes', 'pending-count'] as const;
export const QUOTES_COUNTS_KEY = ['hub-customer-quotes', 'segment-counts'] as const;
export const quotesPipelineKey = (segment: SegmentId, search: string) =>
  ['hub-customer-quotes', 'pipeline', segment, search] as const;
export const quoteRequestKey = (id: string) => ['hub-customer-quotes', 'request', id] as const;
export const quoteDetailKey = (id: string) => ['hub-customer-quotes', 'quote', id] as const;
export const quoteEmailHistoryKey = (id: string) =>
  ['hub-customer-quotes', 'quote', id, 'email-history'] as const;
export const quoteRevisionsKey = (id: string) =>
  ['hub-customer-quotes', 'quote', id, 'revisions'] as const;
