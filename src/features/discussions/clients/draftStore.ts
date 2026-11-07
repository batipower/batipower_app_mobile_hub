import { useSyncExternalStore } from 'react';

import {
  SUPPORT_CHAT_MAX_FILES_PER_MESSAGE,
  type AiSuggestResult,
  type ProposedAction,
  type SupportAttachment,
} from '@/types/supportChat';

/** Même limite que le champ de saisie du web (`ClientComposer`). */
export const CLIENT_MESSAGE_MAX_LENGTH = 4000;

/**
 * Brouillon d'une conversation cliente. Il vit dans un module (et non dans l'état du composer)
 * parce que la feuille d'actions SAV est une route distincte : le texte, les pièces jointes
 * déjà téléversées et le contexte de la Réponse IA doivent survivre à son ouverture, et la
 * feuille doit pouvoir y déposer l'attestation ou le PDF qu'elle vient de générer.
 */
export interface ClientDraft {
  text: string;
  /** Pièces jointes déjà téléversées, jointes au prochain message. */
  attachments: readonly SupportAttachment[];
  /** Commande choisie pour l'analyse IA, l'affinage et les actions SAV. */
  orderReference: string | null;
  /** Texte d'avant le dernier affinage IA (une seule étape d'annulation). */
  textBeforeRefine: string | null;
  /** Dernière Réponse IA : analyse, informations manquantes, actions proposées. */
  aiResult: AiSuggestResult | null;
  /** Actions proposées écartées ou déjà traitées (clés `type:commande`). */
  dismissedActions: readonly string[];
  /** Action proposée à pré-remplir dans la feuille SAV (consommée à son ouverture). */
  actionPrefill: ProposedAction | null;
}

const EMPTY_DRAFT: ClientDraft = Object.freeze({
  text: '',
  attachments: [],
  orderReference: null,
  textBeforeRefine: null,
  aiResult: null,
  dismissedActions: [],
  actionPrefill: null,
});

const drafts = new Map<string, ClientDraft>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getClientDraft(conversationId: string): ClientDraft {
  return drafts.get(conversationId) ?? EMPTY_DRAFT;
}

/** Fusionne des champs dans le brouillon et prévient les abonnés. */
export function patchClientDraft(conversationId: string, patch: Partial<ClientDraft>) {
  drafts.set(conversationId, { ...getClientDraft(conversationId), ...patch });
  emit();
}

/** Brouillon d'une conversation, rafraîchi à chaque modification. */
export function useClientDraft(conversationId: string): ClientDraft {
  return useSyncExternalStore(
    subscribe,
    () => getClientDraft(conversationId),
    () => EMPTY_DRAFT,
  );
}

/**
 * Une partie du brouillon seulement : le composant ne se redessine que si la valeur change
 * (le sélecteur doit renvoyer une valeur stable : primitive ou référence du store).
 */
export function useClientDraftSelector<T>(
  conversationId: string,
  selector: (draft: ClientDraft) => T,
): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getClientDraft(conversationId)),
    () => selector(EMPTY_DRAFT),
  );
}

export function setDraftText(conversationId: string, text: string) {
  patchClientDraft(conversationId, { text: text.slice(0, CLIENT_MESSAGE_MAX_LENGTH) });
}

/** Ajoute un texte à la suite du brouillon (réponse rapide), séparé par une ligne vide. */
export function appendDraftText(conversationId: string, text: string) {
  const current = getClientDraft(conversationId).text;
  const next = current.trim() ? `${current.trimEnd()}\n\n${text}` : text;
  patchClientDraft(conversationId, {
    text: next.slice(0, CLIENT_MESSAGE_MAX_LENGTH),
    textBeforeRefine: null,
  });
}

export function hasRoomForAttachment(conversationId: string, attachment?: SupportAttachment) {
  const { attachments } = getClientDraft(conversationId);
  if (attachment && attachments.some((a) => a.id === attachment.id)) return true;
  return attachments.length < SUPPORT_CHAT_MAX_FILES_PER_MESSAGE;
}

/**
 * Ajoute des pièces jointes au brouillon, sans doublon et dans la limite de 3 par message.
 * Renvoie celles qui n'ont pas pu être ajoutées (limite atteinte).
 */
export function addDraftAttachments(
  conversationId: string,
  added: readonly SupportAttachment[],
): SupportAttachment[] {
  const current = getClientDraft(conversationId).attachments;
  const next = [...current];
  const rejected: SupportAttachment[] = [];
  for (const attachment of added) {
    if (next.some((a) => a.id === attachment.id)) continue;
    if (next.length >= SUPPORT_CHAT_MAX_FILES_PER_MESSAGE) rejected.push(attachment);
    else next.push(attachment);
  }
  patchClientDraft(conversationId, { attachments: next });
  return rejected;
}

export function removeDraftAttachment(conversationId: string, attachmentId: string) {
  patchClientDraft(conversationId, {
    attachments: getClientDraft(conversationId).attachments.filter((a) => a.id !== attachmentId),
  });
}

/** Marque une action proposée comme écartée ou traitée : elle disparaît du panneau IA. */
export function dismissDraftAction(conversationId: string, key: string) {
  const { dismissedActions } = getClientDraft(conversationId);
  if (dismissedActions.includes(key)) return;
  patchClientDraft(conversationId, { dismissedActions: [...dismissedActions, key] });
}

/** Après un envoi réussi : texte et pièces jointes vidés, l'analyse IA reste consultable. */
export function clearDraftAfterSend(conversationId: string) {
  patchClientDraft(conversationId, { text: '', attachments: [], textBeforeRefine: null });
}

/** Oublie le contexte IA (analyse, actions proposées) quand on quitte le fil. */
export function resetDraftAiState(conversationId: string) {
  const draft = getClientDraft(conversationId);
  if (!draft.aiResult && !draft.actionPrefill && draft.dismissedActions.length === 0) return;
  patchClientDraft(conversationId, {
    aiResult: null,
    dismissedActions: [],
    actionPrefill: null,
    orderReference: null,
    textBeforeRefine: null,
  });
}
