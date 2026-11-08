import type { HubCancellationControlItem } from '@/api/hubCancellationControl';
import { formatDateTime } from '@/lib/format';

/**
 * Règles d'affichage du contrôle des annulations, portées de
 * `front_externe_batipower/components/cancellation-control/` : textes et tons identiques au web.
 */

export type CancellationControlTab = 'pending' | 'errors' | 'history' | 'reviewed';

/** Ton d'un texte : traduit en couleur de thème par la carte. */
export type TextTone = 'danger' | 'warning' | 'success' | 'muted' | 'neutral';

export type ToneText = { text: string; tone: TextTone };

export function formatAge(days: number | null): string {
  if (days === null) return '—';
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return '1 jour';
  return `${days} jours`;
}

/** Libellé de ce qui a été constaté dans eBatPro ; « n° eBat » pour un doublon. */
function removedText(item: HubCancellationControlItem): string {
  return `${item.purpose === 'EBAT_DUPLICATE' ? 'N° eBat supprimé' : 'BL supprimé'} — constaté le ${
    formatDateTime(item.checkedAt) ?? '—'
  }`;
}

/** Résultat du contrôle eBatPro, selon l'onglet (colonne « Contrôle » du web). */
export function controlOutcome(item: HubCancellationControlItem, tab: CancellationControlTab): ToneText[] {
  if (tab === 'reviewed') {
    // Le cron continue de contrôler les lignes validées : on montre l'état eBatPro courant.
    if (item.controlStatus === 'STILL_PRESENT') {
      return [
        {
          text: `Toujours présente dans eBatPro (dernière vérif. ${formatDateTime(item.checkedAt) ?? '—'})`,
          tone: 'danger',
        },
      ];
    }
    if (item.controlStatus === 'ERROR') return [{ text: item.message || 'Erreur eBatPro', tone: 'warning' }];
    if (item.controlStatus === 'REMOVED') return [{ text: removedText(item), tone: 'success' }];
    return [{ text: item.message || '—', tone: 'muted' }];
  }

  if (tab === 'history') {
    if (item.creditNote?.validatedAt && item.controlStatus !== 'REMOVED') {
      return [
        {
          text: `Résolue : avoir validé le ${formatDateTime(item.creditNote.validatedAt) ?? '—'}`,
          tone: 'success',
        },
      ];
    }
    if (item.ignoredAt) {
      const lines: ToneText[] = [
        {
          text: `Ignorée par ${item.ignoredByName ?? '—'} le ${formatDateTime(item.ignoredAt) ?? '—'}`,
          tone: 'neutral',
        },
      ];
      if (item.ignoreComment) lines.push({ text: item.ignoreComment, tone: 'muted' });
      return lines;
    }
    return [{ text: removedText(item), tone: 'success' }];
  }

  if (tab === 'errors') return [{ text: item.message || 'Erreur eBatPro', tone: 'warning' }];

  if (item.purpose === 'EBAT_DUPLICATE') {
    return [
      {
        text: `Le n° eBat ${item.targetEbatNumber || item.ebatNumber || 'ciblé'} est toujours présent`,
        tone: 'danger',
      },
    ];
  }
  return [{ text: 'Toujours présente dans eBatPro', tone: 'danger' }];
}

export type CreditNoteView = {
  /** Titre de l'état de l'avoir (« Avoir fait », « Avoir à valider », « Avoir validé »). */
  title: string;
  tone: TextTone;
  lines: string[];
  reference: string | null;
  comment: string | null;
  /** Déclaration validée (revue) par le super admin. */
  reviewed: string | null;
};

/** Bloc « Avoir » de la carte ; `null` tant que le Vérificateur BL n'a rien déclaré. */
export function creditNoteView(item: HubCancellationControlItem): CreditNoteView | null {
  const note = item.creditNote;
  if (!note) return null;

  let title: string;
  let tone: TextTone;
  let lines: string[];
  if (note.validatedAt) {
    title = 'Avoir validé';
    tone = 'success';
    lines = [`par ${note.validatedByName ?? '—'} le ${formatDateTime(note.validatedAt) ?? '—'}`];
  } else if (note.olderInvoice) {
    title = 'Avoir à valider';
    tone = 'warning';
    lines = [
      `Fait par ${note.doneByName ?? '—'} le ${formatDateTime(note.doneAt) ?? '—'}`,
      'Facture antérieure : BL conservé dans eBat',
    ];
  } else {
    title = 'Avoir fait';
    tone = 'success';
    lines = [`par ${note.doneByName ?? '—'} le ${formatDateTime(note.doneAt) ?? '—'}`, 'BL à supprimer dans eBat'];
  }

  return {
    title,
    tone,
    lines,
    reference: note.reference,
    comment: note.comment,
    reviewed: note.reviewedAt
      ? `par ${note.reviewedByName ?? '—'} le ${formatDateTime(note.reviewedAt) ?? '—'}`
      : null,
  };
}

/** Actions disponibles sur une ligne (conditions de `CancellationControlTable` côté web). */
export type RowActions = {
  recheckIgnore: boolean;
  validateCreditNote: boolean;
  reviewCreditNote: boolean;
  unreviewCreditNote: boolean;
};

export type RolePermissions = {
  recheckIgnore: boolean;
  /** SUPERADMIN : valider l'avoir, valider la déclaration, remettre à revoir. */
  review: boolean;
};

export function rowActions(
  item: HubCancellationControlItem,
  tab: CancellationControlTab,
  permissions: RolePermissions,
): RowActions {
  const isHistory = tab === 'history' || tab === 'reviewed';
  const note = item.creditNote;
  return {
    recheckIgnore: permissions.recheckIgnore && !isHistory,
    validateCreditNote:
      permissions.review && tab === 'pending' && !!note?.olderInvoice && !note.validatedAt,
    // Facture antérieure : l'avoir doit d'abord être validé (« Valider l'avoir »).
    reviewCreditNote:
      permissions.review &&
      (tab === 'pending' || tab === 'history') &&
      !!note &&
      !note.reviewedAt &&
      (!note.olderInvoice || !!note.validatedAt),
    unreviewCreditNote: permissions.review && tab === 'reviewed' && !!note?.reviewedAt,
  };
}

export function hasAnyAction(actions: RowActions): boolean {
  return (
    actions.recheckIgnore ||
    actions.validateCreditNote ||
    actions.reviewCreditNote ||
    actions.unreviewCreditNote
  );
}

export function matchesSearch(item: HubCancellationControlItem, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return [
    item.orderReference,
    item.ebatRef ?? '',
    item.ebatNumber ?? '',
    item.validatedByName ?? '',
    ...item.deliveryNotes,
  ].some((value) => value.toLowerCase().includes(needle));
}
