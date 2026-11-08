import type { BadgeTone } from '@/components/ui';
import type {
  CustomerCheckResult,
  PrestaCustomerHit,
  QuoteRequestStatus,
  QuoteRequestSummary,
  QuoteSummary,
} from '@/types/hubCustomerQuotes';

/**
 * Pipeline des devis clients : segments, éléments de liste et libellés de statut. Porté
 * depuis `devis-client/_lib/pipeline-items.ts` du web (sans le rapprochement eBAT, qui reste
 * sur le web : seul le numéro eBAT d'un devis est affiché).
 */

export type SegmentId =
  | 'DEMANDES'
  | 'BROUILLON'
  | 'ENVOYE'
  | 'ACCEPTE'
  | 'CONVERTED'
  | 'ANNULE'
  | 'ARCHIVES';

export const SEGMENTS: readonly { id: SegmentId; label: string }[] = [
  { id: 'DEMANDES', label: 'Demandes' },
  { id: 'BROUILLON', label: 'Brouillons' },
  { id: 'ENVOYE', label: 'Envoyés' },
  { id: 'ACCEPTE', label: 'Acceptés' },
  { id: 'CONVERTED', label: 'Convertis' },
  { id: 'ANNULE', label: 'Annulés' },
  { id: 'ARCHIVES', label: 'Archivés' },
];

/** Segments qui correspondent à un statut de devis unique. */
export type QuoteStatusSegment = 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'CONVERTED' | 'ANNULE';

export function isQuoteStatusSegment(segment: SegmentId): segment is QuoteStatusSegment {
  return segment !== 'DEMANDES' && segment !== 'ARCHIVES';
}

export type PipelineKind = 'DEMANDE' | 'DEVIS';

export type PipelineItem = {
  kind: PipelineKind;
  id: string;
  reference?: string;
  customerLabel: string;
  customerSub?: string;
  /** Devis : client PrestaShop ou prospect. Demande : un compte existe pour cet e-mail. */
  customerKind?: 'PS' | 'PROSPECT';
  status: string;
  createdAt?: string;
  totalHT?: number;
  totalTTC?: number;
  marginPct?: number;
  productCount?: number;
  ebatNumber?: string | null;
  prestashopOrderRef?: string | null;
};

export function upper(value?: string | null): string {
  return (value ?? '').toUpperCase();
}

export function customerHitName(c: Partial<PrestaCustomerHit>): string {
  const fullName = [c.firstname, c.lastname].filter(Boolean).join(' ').trim();
  return fullName || c.company || c.email || 'Client sans nom';
}

export function buildDevisItem(
  q: QuoteSummary,
  psResolved: Record<string, PrestaCustomerHit> = {},
): PipelineItem {
  const hit = q.customerPrestashopId != null ? psResolved[String(q.customerPrestashopId)] : undefined;
  const isPs = q.customerPrestashopId != null;
  return {
    kind: 'DEVIS',
    id: q.id,
    reference: q.reference,
    customerLabel:
      q.customerLabel ||
      (hit ? customerHitName(hit) : undefined) ||
      q.customerDraft?.email ||
      (isPs ? `Client sans nom · PS #${q.customerPrestashopId}` : '—'),
    customerKind: isPs ? 'PS' : q.customerDraft ? 'PROSPECT' : undefined,
    status: upper(q.status),
    createdAt: q.createdAt,
    totalHT: q.totalHT,
    totalTTC: q.totalTTC,
    marginPct: q.totalMarginPct,
    ebatNumber: q.ebatQuoteNumber,
    prestashopOrderRef: q.prestashopOrderRef,
  };
}

/**
 * Une demande reste visible dans « Demandes » tant qu'elle n'est ni archivée ni refusée ET que
 * son devis converti (le cas échéant) est encore en brouillon.
 */
export function isDemandeVisible(r: QuoteRequestSummary): boolean {
  if (r.status === 'ARCHIVEE' || r.status === 'REFUSEE') return false;
  const converted = upper(r.convertedQuote?.status);
  return !converted || converted === 'BROUILLON' || converted === 'DRAFT';
}

export function buildDemandeItem(
  r: QuoteRequestSummary,
  customers: Record<string, CustomerCheckResult> = {},
): PipelineItem {
  const found = customers[r.email]?.found === true;
  return {
    kind: 'DEMANDE',
    id: r.id,
    reference: r.reference,
    customerLabel: r.company || r.name || r.email || '—',
    customerSub: r.company && r.name ? r.name : r.name ? r.email : undefined,
    customerKind: found ? 'PS' : undefined,
    status: r.status,
    createdAt: r.createdAt,
    productCount: r.products.length,
  };
}

// ─── Libellés et tons des statuts ────────────────────────────────────────────

type StatusMeta = { label: string; tone: BadgeTone };

const QUOTE_STATUS: Record<string, StatusMeta> = {
  BROUILLON: { label: 'Brouillon', tone: 'neutral' },
  ENVOYE: { label: 'Envoyé', tone: 'blue' },
  ACCEPTE: { label: 'Accepté', tone: 'green' },
  CONVERTED: { label: 'Converti', tone: 'purple' },
  ANNULE: { label: 'Annulé', tone: 'red' },
  REFUSE: { label: 'Refusé', tone: 'red' },
  EXPIRE: { label: 'Expiré', tone: 'amber' },
};

const REQUEST_STATUS: Record<QuoteRequestStatus, StatusMeta> = {
  NOUVELLE: { label: 'Nouvelle', tone: 'amber' },
  EN_COURS: { label: 'En cours', tone: 'blue' },
  TRAITEE: { label: 'Traitée', tone: 'green' },
  ARCHIVEE: { label: 'Archivée', tone: 'neutral' },
  REFUSEE: { label: 'Refusée', tone: 'red' },
};

export function quoteStatusMeta(status?: string | null): StatusMeta {
  const key = upper(status);
  return QUOTE_STATUS[key] ?? { label: status || '—', tone: 'neutral' };
}

export function requestStatusMeta(status?: string | null): StatusMeta {
  return REQUEST_STATUS[status as QuoteRequestStatus] ?? { label: status || '—', tone: 'neutral' };
}

export function itemStatusMeta(item: PipelineItem): StatusMeta {
  return item.kind === 'DEMANDE' ? requestStatusMeta(item.status) : quoteStatusMeta(item.status);
}

// ─── Verrouillage de l'éditeur ───────────────────────────────────────────────

/**
 * Un devis envoyé (ou accepté, converti, annulé) n'est plus modifiable ; refusé ou expiré, il
 * l'est aussi dès que les versions sont imposées par le serveur — sauf si une nouvelle version
 * est ouverte. Mêmes règles que `QuoteEditor` / `useQuoteStatus` côté web.
 */
export function isQuoteReadOnly(params: {
  status: string;
  revisionsEnforced: boolean;
  revisionDraftOpen: boolean;
}): boolean {
  const status = upper(params.status);
  if (params.revisionDraftOpen) return false;
  if (status === 'ENVOYE' || status === 'ACCEPTE' || status === 'CONVERTED' || status === 'ANNULE') {
    return true;
  }
  return params.revisionsEnforced && (status === 'REFUSE' || status === 'EXPIRE');
}
