import { apiClient } from '@/api/client';

/**
 * Contrôle des annulations du HUB (`hub-app/cancellation-control`) : annulations validées dont la
 * commande ou le BL existe encore dans eBatPro. Contrat repris de
 * `front_externe_batipower/lib/api/hub-cancellation-control.ts`, sans « Avoir fait » (réservé au
 * Vérificateur BL, via `logistics-app`).
 */

/** `reviewed` : déclarations « Avoir fait » validées par le super admin. */
export type HubCancellationControlView = 'pending' | 'history' | 'reviewed';

export type CancellationEbatControlStatus = 'STILL_PRESENT' | 'REMOVED' | 'NOT_APPLICABLE' | 'ERROR';

export type OrderCancellationPurpose = 'FULL_ORDER' | 'EBAT_DUPLICATE';

/** Avoir déclaré fait par le Vérificateur BL. */
export interface HubCancellationCreditNote {
  doneAt: string;
  doneByName: string | null;
  reference: string | null;
  /** Facture antérieure au mois en cours : le BL reste dans eBat, validation finale par le super admin. */
  olderInvoice: boolean;
  comment: string | null;
  validatedAt: string | null;
  validatedByName: string | null;
  /** Déclaration validée (revue) par le super admin. */
  reviewedAt?: string | null;
  reviewedByName?: string | null;
}

export interface HubCancellationControlItem {
  id: string;
  orderReference: string;
  ebatRef: string | null;
  origin: string | null;
  warehouse: string;
  purpose?: OrderCancellationPurpose;
  targetEbatNumber?: string | null;
  reason: string;
  requestedByName: string | null;
  validatedByName: string | null;
  validatedAt: string | null;
  controlStatus: CancellationEbatControlStatus | null;
  checkedAt: string | null;
  message: string | null;
  /** N° de commande eBatPro de la dernière détection. */
  ebatNumber: string | null;
  ebatStatusLabel: string | null;
  deliveryNotes: string[];
  ignoredAt: string | null;
  ignoredByName: string | null;
  ignoreComment: string | null;
  /** Avoir déclaré fait (null tant que le Vérificateur BL n'a rien déclaré). */
  creditNote: HubCancellationCreditNote | null;
  daysSinceValidation: number | null;
  /** PA HT estimé de la commande, null si non calculé. */
  estimatedPurchaseHT?: number | null;
}

export interface HubCancellationControlResponse {
  /** Alertes BL encore présent. */
  count: number;
  items: HubCancellationControlItem[];
  /** Contrôles en erreur eBatPro, à re-vérifier (vue `pending` uniquement). */
  errors?: { count: number; items: HubCancellationControlItem[] };
  /** Avoirs sur facture antérieure en attente de validation du super admin (vue `pending`). */
  creditNoteToValidateCount?: number;
}

/** Longueur minimale / maximale du commentaire d'une alerte ignorée. */
export const IGNORE_COMMENT_MIN_LENGTH = 3;
export const IGNORE_COMMENT_MAX_LENGTH = 1000;

const base = (id: string) => `hub-app/cancellation-control/${encodeURIComponent(id)}`;

export const hubCancellationControlApi = {
  list(status: HubCancellationControlView, options?: { signal?: AbortSignal }) {
    return apiClient.get<HubCancellationControlResponse>('hub-app/cancellation-control', {
      signal: options?.signal,
      query: status === 'history' || status === 'reviewed' ? { status } : undefined,
    });
  },

  recheck(id: string) {
    return apiClient.post<HubCancellationControlItem>(`${base(id)}/recheck`, {});
  },

  ignore(id: string, comment: string) {
    return apiClient.patch<HubCancellationControlItem>(`${base(id)}/ignore`, { comment });
  },

  /** Validation finale d'un avoir sur facture antérieure (SUPERADMIN). */
  validateCreditNote(id: string) {
    return apiClient.patch<HubCancellationControlItem>(`${base(id)}/credit-note-validate`, {});
  },

  /** Valide (revue) une déclaration « Avoir fait » : la ligne passe dans « Validées » (SUPERADMIN). */
  reviewCreditNote(id: string) {
    return apiClient.patch<HubCancellationControlItem>(`${base(id)}/credit-note-review`, {});
  },

  /** Annule la revue d'une déclaration (SUPERADMIN). */
  unreviewCreditNote(id: string) {
    return apiClient.patch<HubCancellationControlItem>(`${base(id)}/credit-note-unreview`, {});
  },
};
