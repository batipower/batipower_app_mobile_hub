import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner-native';

import { supportChatApi } from '@/api/supportChat';
import { errorMessage } from '@/features/preparation/components/ListState';

import { CLIENT_MESSAGE_MAX_LENGTH, getClientDraft, patchClientDraft } from './draftStore';
import { hapticError, hapticSuccess } from './feedback';

export type AiPhase = 'idle' | 'suggest' | 'refine';

export interface AiAssist {
  phase: AiPhase;
  busy: boolean;
  /** Secondes écoulées depuis le début de la requête en cours. */
  elapsed: number;
  /** Génère une réponse (et l'analyse) ; le texte est placé dans le brouillon. */
  suggest: (orderReference?: string) => Promise<void>;
  /** Affine le brouillon ; résout `true` si le brouillon a été remplacé. */
  refine: (instructions: string) => Promise<boolean>;
  /** Abandonne l'attente côté interface : le résultat éventuel est ignoré. */
  cancel: () => void;
  /** Restaure le brouillon d'avant le dernier affinage. */
  undoRefine: () => void;
}

/**
 * Réponse IA et affinage d'une conversation. Les requêtes sont lentes côté back (jusqu'à 90 s) :
 * l'état d'attente est exposé (`phase`, `elapsed`) et peut être abandonné. Le contexte (analyse,
 * commande choisie, texte d'avant l'affinage) est écrit dans le store de brouillon, que la feuille
 * SAV partage.
 */
export function useAiAssist(conversationId: string): AiAssist {
  const [phase, setPhase] = useState<AiPhase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const busy = useRef(false);
  /** Jeton de la requête valide : toute annulation ou démontage l'invalide. */
  const ticketRef = useRef(0);

  useEffect(() => {
    if (phase === 'idle') return;
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(
    () => () => {
      ticketRef.current += 1;
    },
    [],
  );

  const cancel = useCallback(() => {
    ticketRef.current += 1;
    busy.current = false;
    setPhase('idle');
  }, []);

  const suggest = useCallback(
    async (orderReference?: string) => {
      if (busy.current) return;
      busy.current = true;
      const ticket = ++ticketRef.current;
      setElapsed(0);
      setPhase('suggest');
      try {
        const result = await supportChatApi.aiSuggest(conversationId, orderReference);
        if (ticket !== ticketRef.current) return;
        patchClientDraft(conversationId, {
          text: result.suggestion.slice(0, CLIENT_MESSAGE_MAX_LENGTH),
          textBeforeRefine: null,
          aiResult: result,
          orderReference: result.order?.reference ?? orderReference ?? null,
          dismissedActions: [],
        });
        hapticSuccess();
      } catch (error) {
        if (ticket !== ticketRef.current) return;
        hapticError();
        toast.error(errorMessage(error, 'La Réponse IA a échoué.'));
      } finally {
        if (ticket === ticketRef.current) {
          busy.current = false;
          setPhase('idle');
        }
      }
    },
    [conversationId],
  );

  const refine = useCallback(
    async (instructions: string) => {
      const draft = getClientDraft(conversationId);
      const current = draft.text;
      const consigne = instructions.trim();
      if (busy.current || !current.trim() || !consigne) return false;
      busy.current = true;
      const ticket = ++ticketRef.current;
      setElapsed(0);
      setPhase('refine');
      try {
        const result = await supportChatApi.aiRefine(conversationId, {
          draft: current.trim(),
          instructions: consigne,
          orderReference: draft.aiResult?.order?.reference ?? draft.orderReference ?? undefined,
        });
        if (ticket !== ticketRef.current) return false;
        if (!result?.suggestion?.trim()) {
          toast.error('L’IA n’a pas renvoyé de texte : brouillon conservé.');
          return false;
        }
        patchClientDraft(conversationId, {
          textBeforeRefine: current,
          text: result.suggestion.slice(0, CLIENT_MESSAGE_MAX_LENGTH),
        });
        hapticSuccess();
        return true;
      } catch (error) {
        if (ticket === ticketRef.current) {
          hapticError();
          toast.error(errorMessage(error, 'L’affinage a échoué.'));
        }
        return false;
      } finally {
        if (ticket === ticketRef.current) {
          busy.current = false;
          setPhase('idle');
        }
      }
    },
    [conversationId],
  );

  const undoRefine = useCallback(() => {
    const { textBeforeRefine } = getClientDraft(conversationId);
    if (textBeforeRefine == null) return;
    patchClientDraft(conversationId, { text: textBeforeRefine, textBeforeRefine: null });
  }, [conversationId]);

  return { phase, busy: phase !== 'idle', elapsed, suggest, refine, cancel, undoRefine };
}
