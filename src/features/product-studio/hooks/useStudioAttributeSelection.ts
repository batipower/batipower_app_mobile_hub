/* eslint-disable react-hooks/exhaustive-deps -- les `useLatest` sont des refs stables, volontairement hors dépendances */

import { useLatest } from '../lib/useLatest';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner-native';
import { getApiErrorMessage } from '../lib/errors';
import { hubProductStudioApi } from '@/api/hubProductStudio';
import { attributesOf, sameNameSet, serverSelectedAttributes } from '../domain/model';
import type { StudioAttribute, StudioDraft } from '@/types/hubStudio';
import { useStudioCache } from './useStudioQueries';

const SAVE_DELAY_MS = 450;

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Sélection d'attributs optimiste : la case se coche immédiatement, l'envoi est
 * regroupé après `SAVE_DELAY_MS` d'inactivité. L'état local s'efface dès que le
 * serveur confirme la même sélection.
 */
export function useStudioAttributeSelection(reference: string, draft: StudioDraft | null) {
  const { setDraft } = useStudioCache(reference);
  const [override, setOverride] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const overrideRef = useRef<string[] | null>(null);
  const draftRef = useLatest(draft);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genRef = useRef(0);

  const persist = useCallback(
    async (names: string[]): Promise<boolean> => {
      const gen = ++genRef.current;
      setSaving(true);
      try {
        const next = await hubProductStudioApi.decideAttributes(reference, names);
        if (genRef.current !== gen) return false;
        setDraft(next);
        if (overrideRef.current && sameNameSet(overrideRef.current, names)) {
          overrideRef.current = null;
          setOverride(null);
        }
        return true;
      } catch (error) {
        if (genRef.current !== gen) return false;
        toast.error(getApiErrorMessage(error, 'Mise à jour des attributs en échec'));
        return false;
      } finally {
        if (genRef.current === gen) setSaving(false);
      }
    },
    [reference, setDraft],
  );
  const persistRef = useLatest(persist);

  const replaceSelection = useCallback((names: string[]) => {
    overrideRef.current = names;
    setOverride([...names]);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persistRef.current(names);
    }, SAVE_DELAY_MS);
  }, []);

  const currentSelection = useCallback(() => overrideRef.current ?? serverSelectedAttributes(draftRef.current), []);

  const setAttributesSelected = useCallback(
    (names: string[], selected: boolean) => {
      const base = currentSelection().filter((item) => !names.some((name) => sameName(item, name)));
      replaceSelection(selected ? [...base, ...names] : base);
    },
    [currentSelection, replaceSelection],
  );

  const toggleAttribute = useCallback(
    (name: string, selected: boolean) => setAttributesSelected([name], selected),
    [setAttributesSelected],
  );

  /** Envoie immédiatement la sélection en attente. `false` si l'envoi échoue. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (!timerRef.current) return true;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    return overrideRef.current ? persistRef.current(overrideRef.current) : true;
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    overrideRef.current = null;
    setOverride(null);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const attributes: StudioAttribute[] = useMemo(() => {
    const selected = new Set((override ?? serverSelectedAttributes(draft)).map((name) => name.toLowerCase()));
    return attributesOf(draft).map((attr) => ({
      ...attr,
      selected: selected.has((attr.canonicalName || '').toLowerCase()),
    }));
  }, [draft, override]);

  return {
    attributes,
    saving,
    toggleAttribute,
    setAttributesSelected,
    selectedNames: currentSelection,
    hasPendingSave: () => timerRef.current !== null,
    flush,
    reset,
  };
}
