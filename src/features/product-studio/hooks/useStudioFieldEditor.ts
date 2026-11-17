/* eslint-disable react-hooks/exhaustive-deps -- les `useLatest` sont des refs stables, volontairement hors dépendances */

import { useLatest } from '../lib/useLatest';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner-native';
import { getApiErrorMessage } from '../lib/errors';
import { hubProductStudioApi } from '@/api/hubProductStudio';
import {
  committedValue,
  factValue,
  fieldDecision,
  FIELDS,
  rawProposedValue,
  type StudioFieldDef,
} from '../domain/model';
import type { StudioDraft, StudioFieldDecision, StudioFieldKey, StudioFieldReason } from '@/types/hubStudio';
import { useStudioCache } from './useStudioQueries';

const AUTOSAVE_MS = 1200;

export type FieldSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface StudioFieldView extends StudioFieldDef {
  value: string;
  /** Texte de la fiche PrestaShop actuelle (comparaison). */
  current: string;
  /** Proposition d'origine de la génération. */
  proposal: string;
  decision: StudioFieldDecision;
  /** Cause de la décision (système ou utilisateur) ; absente des brouillons anciens. */
  reason: StudioFieldReason | null;
  mode: string;
  saveState: FieldSaveState;
  /** Consigne libre envoyée au prochain recalcul. */
  instruction: string;
  saveError?: string;
}

function isDirty(state: FieldSaveState | undefined): boolean {
  return state === 'dirty' || state === 'error';
}

/**
 * Édition champ par champ du brouillon : saisie locale, autosave différé avec
 * compteur de génération (une réponse tardive n'écrase jamais une saisie plus
 * récente), validation / refus / retour à la proposition / recalcul IA.
 */
export function useStudioFieldEditor(reference: string, draft: StudioDraft | null) {
  const { setDraft } = useStudioCache(reference);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<Partial<Record<StudioFieldKey, FieldSaveState>>>({});
  const [saveErrors, setSaveErrors] = useState<Partial<Record<StudioFieldKey, string>>>({});
  const [hints, setHints] = useState<Partial<Record<StudioFieldKey, string>>>({});
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  const draftRef = useLatest(draft);
  const editsRef = useRef<Record<string, string>>({});
  const saveStateRef = useLatest(saveState);
  const hintsRef = useLatest(hints);
  const timersRef = useRef<Partial<Record<StudioFieldKey, ReturnType<typeof setTimeout>>>>({});
  const genRef = useRef<Partial<Record<StudioFieldKey, number>>>({});
  const bulkLockRef = useRef(false);
  // Les callbacks différés (timers) appellent toujours la dernière version de `persistField`.
  const persistFieldRef = useRef<(field: StudioFieldKey, value: string) => Promise<boolean>>(async () => false);

  const markSave = useCallback((field: StudioFieldKey, state: FieldSaveState, error?: string) => {
    setSaveState((prev) => ({ ...prev, [field]: state }));
    setSaveErrors((prev) => {
      if (error === undefined && !(field in prev)) return prev;
      const next = { ...prev };
      if (error === undefined) delete next[field];
      else next[field] = error;
      return next;
    });
  }, []);

  const setBusyKey = useCallback((key: string, on: boolean) => {
    setBusy((prev) => {
      if (prev.has(key) === on) return prev;
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const clearTimer = useCallback((field: StudioFieldKey) => {
    const timer = timersRef.current[field];
    if (timer) clearTimeout(timer);
    delete timersRef.current[field];
  }, []);

  const clearEdit = useCallback((field: StudioFieldKey) => {
    delete editsRef.current[field];
    setEdits((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const persistDecision = useCallback(
    async (field: StudioFieldKey, decision: StudioFieldDecision, editedValue?: string): Promise<boolean> => {
      if (!draftRef.current?.id) return false;
      const gen = (genRef.current[field] ?? 0) + 1;
      genRef.current[field] = gen;
      clearTimer(field);
      markSave(field, 'saving');
      setBusyKey(`field:${field}`, true);
      try {
        const next = await hubProductStudioApi.decideField(reference, field, decision, editedValue);
        if (genRef.current[field] !== gen) return false;
        setDraft(next);
        const local = editsRef.current[field];
        if (local === undefined || local === (editedValue ?? rawProposedValue(next, field))) clearEdit(field);
        markSave(field, 'saved');
        return true;
      } catch (error) {
        if (genRef.current[field] !== gen) return false;
        const message = getApiErrorMessage(error, "Enregistrement du champ en échec");
        markSave(field, 'error', message);
        toast.error(message);
        return false;
      } finally {
        if (genRef.current[field] === gen) setBusyKey(`field:${field}`, false);
      }
    },
    [clearEdit, clearTimer, markSave, reference, setBusyKey, setDraft],
  );

  const persistField = useCallback(
    async (field: StudioFieldKey, value: string): Promise<boolean> => {
      const current = draftRef.current;
      if (!current?.id) return false;
      if (value === committedValue(current, field)) {
        clearEdit(field);
        markSave(field, 'idle');
        return true;
      }
      return persistDecision(field, 'EDITED', value);
    },
    [clearEdit, markSave, persistDecision],
  );
  useLayoutEffect(() => {
    persistFieldRef.current = persistField;
  });

  const setFieldValue = useCallback(
    (field: StudioFieldKey, value: string) => {
      editsRef.current[field] = value;
      setEdits((prev) => ({ ...prev, [field]: value }));
      markSave(field, 'dirty');
      clearTimer(field);
      timersRef.current[field] = setTimeout(() => {
        delete timersRef.current[field];
        const latest = editsRef.current[field];
        if (latest !== undefined) void persistFieldRef.current(field, latest);
      }, AUTOSAVE_MS);
    },
    [clearTimer, markSave],
  );

  const flushField = useCallback(
    (field: StudioFieldKey) => {
      clearTimer(field);
      const value = editsRef.current[field];
      if (value !== undefined) void persistFieldRef.current(field, value);
    },
    [clearTimer],
  );

  /** Enregistre toutes les saisies en attente. `false` si l'une d'elles échoue. */
  const flushAll = useCallback(async (): Promise<boolean> => {
    for (const field of Object.keys(editsRef.current) as StudioFieldKey[]) {
      const value = editsRef.current[field];
      if (value === undefined) continue;
      if (!(await persistFieldRef.current(field, value))) return false;
    }
    return true;
  }, []);

  const decisionFor = useCallback(
    (field: StudioFieldKey, value: string): { decision: StudioFieldDecision; edited?: string } => {
      const decision: StudioFieldDecision = value === rawProposedValue(draftRef.current, field) ? 'ACCEPTED' : 'EDITED';
      return { decision, edited: decision === 'EDITED' ? value : undefined };
    },
    [],
  );

  const validateField = useCallback(
    async (field: StudioFieldKey) => {
      const current = draftRef.current;
      if (!current) return;
      const value = editsRef.current[field] ?? committedValue(current, field);
      const { decision, edited } = decisionFor(field, value);
      if (decision === 'ACCEPTED' && fieldDecision(current, field) === 'ACCEPTED' && editsRef.current[field] === undefined) {
        return;
      }
      const ok = await persistDecision(field, decision, edited);
      if (ok) toast.success(`${FIELDS.find((item) => item.key === field)?.label ?? 'Champ'} validé`);
    },
    [decisionFor, persistDecision],
  );

  const rejectField = useCallback(
    async (field: StudioFieldKey) => {
      clearEdit(field);
      if (await persistDecision(field, 'REJECTED')) toast.success('Champ refusé — il ne sera pas écrit');
    },
    [clearEdit, persistDecision],
  );

  const restoreProposal = useCallback(
    async (field: StudioFieldKey) => {
      const proposal = rawProposedValue(draftRef.current, field);
      editsRef.current[field] = proposal;
      setEdits((prev) => ({ ...prev, [field]: proposal }));
      if (await persistDecision(field, 'ACCEPTED')) {
        clearEdit(field);
        toast.success("Proposition d'origine rétablie");
      }
    },
    [clearEdit, persistDecision],
  );

  const regenerateField = useCallback(
    async (field: StudioFieldKey) => {
      if (!draftRef.current?.id) return;
      clearTimer(field);
      setBusyKey(`regen:${field}`, true);
      try {
        setDraft(await hubProductStudioApi.regenerateField(reference, field, hintsRef.current[field]));
        clearEdit(field);
        markSave(field, 'idle');
        toast.success('Nouvelle proposition générée');
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Recalcul du champ en échec'));
      } finally {
        setBusyKey(`regen:${field}`, false);
      }
    },
    [clearEdit, clearTimer, markSave, reference, setBusyKey, setDraft],
  );

  /** Valide tous les champs en attente. `true` si tous sont enregistrés (ou déjà validés). */
  const acceptAll = useCallback(async (): Promise<boolean> => {
    const current = draftRef.current;
    if (!current || bulkLockRef.current) return false;
    const targets = FIELDS.filter(
      (field) => editsRef.current[field.key] !== undefined || fieldDecision(current, field.key) === 'PENDING',
    );
    if (!targets.length) {
      toast.success('Tous les champs sont déjà validés');
      return true;
    }
    bulkLockRef.current = true;
    (Object.keys(timersRef.current) as StudioFieldKey[]).forEach(clearTimer);
    setBulk({ done: 0, total: targets.length });
    let failed = 0;
    try {
      for (let index = 0; index < targets.length; index += 1) {
        const key = targets[index]!.key;
        const latest = draftRef.current;
        const value = editsRef.current[key] ?? (latest ? committedValue(latest, key) : '');
        const { decision, edited } = decisionFor(key, value);
        if (!(await persistDecision(key, decision, edited))) failed += 1;
        setBulk({ done: index + 1, total: targets.length });
      }
      if (failed) toast.error(`${failed} champ${failed > 1 ? 's' : ''} n'ont pas pu être validés`);
      else toast.success('Champs validés');
      return failed === 0;
    } finally {
      setBulk(null);
      bulkLockRef.current = false;
    }
  }, [clearTimer, decisionFor, persistDecision]);

  const setFieldHint = useCallback(
    (field: StudioFieldKey, value: string) => setHints((prev) => ({ ...prev, [field]: value })),
    [],
  );

  /** Saisie non enregistrée ou enregistrement en cours. */
  const hasUnsavedWork = useCallback(
    () =>
      Object.keys(editsRef.current).length > 0 ||
      Object.values(saveStateRef.current).some((state) => state === 'dirty' || state === 'saving'),
    [],
  );

  /** Repart d'un brouillon neuf (après préparation) : abandonne les saisies locales. */
  const reset = useCallback(() => {
    (Object.keys(timersRef.current) as StudioFieldKey[]).forEach(clearTimer);
    editsRef.current = {};
    genRef.current = {};
    setEdits({});
    setSaveState({});
    setSaveErrors({});
    setHints({});
    setBusy(new Set());
  }, [clearTimer]);

  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach((timer) => timer && clearTimeout(timer));
    },
    [],
  );

  const fieldViews: StudioFieldView[] = useMemo(
    () =>
      FIELDS.map((field) => ({
        ...field,
        value: edits[field.key] ?? committedValue(draft, field.key),
        current: factValue(draft, field.key),
        proposal: rawProposedValue(draft, field.key),
        decision: fieldDecision(draft, field.key),
        reason: draft?.fieldReasons?.[field.key] ?? null,
        mode: draft?.fieldModes?.[field.key] ?? 'GENERATE',
        saveState: saveState[field.key] ?? 'idle',
        instruction: hints[field.key] ?? '',
        saveError: saveErrors[field.key],
      })),
    [draft, edits, hints, saveErrors, saveState],
  );

  const validated = useMemo(
    () => ({
      done: fieldViews.filter((field) => field.decision === 'ACCEPTED' || field.decision === 'EDITED').length,
      total: fieldViews.length,
    }),
    [fieldViews],
  );

  const pendingFieldCount = fieldViews.filter((field) => isDirty(field.saveState) || field.decision === 'PENDING').length;

  return {
    fieldViews,
    validated,
    pendingFieldCount,
    bulk,
    getPendingEdits: () => ({ ...editsRef.current }),
    isFieldBusy: (key: string) => busy.has(key),
    setFieldValue,
    flushField,
    flushAll,
    validateField,
    rejectField,
    restoreProposal,
    regenerateField,
    acceptAll,
    setFieldHint,
    hasUnsavedWork,
    reset,
  };
}
