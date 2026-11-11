import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import type { StagingItem } from '@/types/hubProductAnalyzer';

import { negotiationCategoryRulesQuery, useNegotiationCategoryRules } from '../hooks/useNegotiationCategoryRules';
import { clearSelection, fetchAllFilteredItems, refreshAnalyzerData } from '../bulkActions';
import { getPaFilters } from '../filtersStore';
import { apiErrorMessage } from '../lib/errors';
import type {
  AssignNegotiationItem,
  BulkAssignResult,
  EligibleReferentsResult,
  NegotiationCategoryType,
  PreviewItem,
} from '../lib/negotiation-api';
import {
  DEFAULT_TARGET_MARGIN_PCT,
  clampMarginPct,
  hasNoWeight,
  suggestCategoryForItem,
  suggestPriceFor,
  toNegotiationDialogItem,
  type NegotiationDialogItem,
  type PriceSuggestionKind,
} from '../lib/negotiation-items';
import type { PaNegoSource } from '../navigation';
import { getSelectedItems } from '../selectionStore';

import { loadPreviewsAndOverrides } from './loadPreviews';

const ASSIGN_CHUNK = 200;
const WAREHOUSE_CONCURRENCY = 10;
export const VOLUME_WARN_THRESHOLD = 300;

export type ExclusionReason =
  | 'launched'
  | 'no_weight'
  | 'no_warehouse'
  | 'no_price'
  | 'fallback_price'
  | 'no_referent'
  | 'manual';

export const EXCLUSION_LABEL: Record<ExclusionReason, string> = {
  launched: 'déjà lancés',
  no_weight: 'sans poids (port non calculable)',
  no_warehouse: 'sans entrepôt',
  no_price: 'prix non calculable',
  fallback_price: 'prix de repli (85 % / IA)',
  no_referent: 'sans service identifié',
  manual: 'retirés par vous',
};

export type PreparedItem = {
  item: NegotiationDialogItem;
  price: number | null;
  priceKind: PriceSuggestionKind | 'manual' | null;
  categoryOverride: NegotiationCategoryType | '';
  referentCount: number;
  referentNames: string[];
  exclusion: ExclusionReason | null;
};

export type ServiceGroup = {
  key: string;
  label: string;
  suggested: NegotiationCategoryType | '';
  uuids: string[];
};

/**
 * Brouillon de l'assistant de négociation : produits chargés selon l'origine (un produit, la
 * sélection, tout le filtre), prix suggérés selon la marge cible, référents prévisibles, et envoi
 * par lots. Reste monté pendant les 3 étapes, donc rien n'est perdu en revenant en arrière.
 */
export function useNegotiationDraft(source: PaNegoSource, uuid: string | undefined, stagingFromQuery?: StagingItem) {
  const [targetMarginPct, setTargetMarginPct] = useState(DEFAULT_TARGET_MARGIN_PCT);
  const [includeFallbackPrices, setIncludeFallbackPrices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [capped, setCapped] = useState(false);
  const [items, setItems] = useState<NegotiationDialogItem[]>([]);
  const [previewByUuid, setPreviewByUuid] = useState<Map<string, PreviewItem>>(new Map());
  const [overrideByUuid, setOverrideByUuid] = useState<Record<string, EligibleReferentsResult | null>>({});
  const [serviceByUuid, setServiceByUuid] = useState<Record<string, NegotiationCategoryType>>({});
  const [manualExcluded, setManualExcluded] = useState<Set<string>>(new Set());
  const [manualPrice, setManualPrice] = useState<Record<string, number>>({});
  const [applying, setApplying] = useState<'service' | 'warehouse' | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendProgress, setSendProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<BulkAssignResult | null>(null);
  const gen = useRef(0);
  const referentCache = useRef(new Map<string, EligibleReferentsResult>());
  const queryClient = useQueryClient();
  // Règles de service par filiale (tolérant : sans réponse, jeu par défaut = 1re lettre).
  const { data: categoryRules } = useNegotiationCategoryRules();
  const categoryRulesRef = useRef(categoryRules);
  useEffect(() => {
    if (categoryRules) categoryRulesRef.current = categoryRules;
  }, [categoryRules]);

  // Clé de rechargement d'un produit unique : le poids, l'entrepôt ou le code changent après une édition.
  const singleKey = stagingFromQuery
    ? `${stagingFromQuery.weightGrams}|${stagingFromQuery.warehouse}|${stagingFromQuery.codeEbat}|${stagingFromQuery.customerPriceHT}`
    : '';

  useEffect(() => {
    // Produit unique : on attend que la fiche soit disponible (cache de la liste ou réseau).
    if (source === 'item' && !stagingFromQuery) return;
    const myGen = ++gen.current;
    const isStale = () => myGen !== gen.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement des données à chaque changement d'origine
    setLoadError(null);
    setLoading(true);

    (async () => {
      try {
        let raw: StagingItem[] = [];
        if (source === 'selection') {
          raw = getSelectedItems();
        } else if (source === 'item') {
          raw = stagingFromQuery ? [stagingFromQuery] : [];
        } else {
          const res = await fetchAllFilteredItems(getPaFilters(), (loaded, total) => {
            if (!isStale()) setLoadProgress({ loaded, total });
          });
          if (isStale()) return;
          setCapped(res.capped);
          raw = res.items;
        }
        const eligible = raw.filter((it) => it.status !== 'LAUNCHED').map((it) => toNegotiationDialogItem(it));
        setItems(eligible);
        // Règles des filiales (cache partagé) connues avant le calcul des suggestions de service.
        const rules = await queryClient
          .fetchQuery(negotiationCategoryRulesQuery)
          .then((d) => {
            categoryRulesRef.current = d;
            return d;
          })
          .catch(() => categoryRulesRef.current);
        if (isStale()) return;
        const data = await loadPreviewsAndOverrides(eligible, referentCache.current, isStale, rules);
        if (!data || isStale()) return;
        setPreviewByUuid(data.previews);
        setOverrideByUuid(data.overrides);
        setServiceByUuid(data.services);
      } catch (e) {
        if (!isStale()) setLoadError(apiErrorMessage(e, 'Impossible de charger les produits'));
      } finally {
        if (!isStale()) {
          setLoading(false);
          setLoadProgress(null);
        }
      }
    })();

    return () => {
      gen.current += 1;
    };
    // `stagingFromQuery` est volontairement représenté par `singleKey` (pas de rechargement à chaque rendu).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, uuid, singleKey]);

  const prepared = useMemo<PreparedItem[]>(() => {
    return items.map((item): PreparedItem => {
      const base = { item, price: null, priceKind: null, categoryOverride: '' as const, referentCount: 0, referentNames: [] };
      if (item.status === 'LAUNCHED') return { ...base, exclusion: 'launched' };
      if (hasNoWeight(item)) return { ...base, exclusion: 'no_weight' };
      if (!item.warehouse) return { ...base, exclusion: 'no_warehouse' };

      const manual = manualPrice[item.stagingUuid];
      const sugg = manual != null ? { value: manual, kind: 'manual' as const } : suggestPriceFor(item, targetMarginPct);
      const preview = previewByUuid.get(item.stagingUuid);
      const override = overrideByUuid[item.stagingUuid];
      const assignedService = serviceByUuid[item.stagingUuid];
      const referents = override?.referents ?? preview?.referents ?? [];
      const suggestedCat = suggestCategoryForItem(item, categoryRules);
      const hasAutoService = !!preview && preview.categoryTypes.length > 0;
      const needsOverride = !preview || !hasAutoService;
      const categoryOverride: NegotiationCategoryType | '' =
        (needsOverride ? assignedService : undefined) ||
        (needsOverride && suggestedCat && override && override.referents.length > 0 ? suggestedCat.category : '');

      let exclusion: ExclusionReason | null = null;
      if (manualExcluded.has(item.stagingUuid)) exclusion = 'manual';
      else if (!sugg) exclusion = 'no_price';
      else if ((sugg.kind === 'fallback_85' || sugg.kind === 'recommended') && !includeFallbackPrices) {
        exclusion = 'fallback_price';
      } else if (!hasAutoService && !categoryOverride) {
        // Sans service identifié personne ne verrait la ligne ; avec un service mais sans RA/RAR, elle part quand même.
        exclusion = 'no_referent';
      }
      return {
        item,
        price: sugg?.value ?? null,
        priceKind: sugg?.kind ?? null,
        categoryOverride,
        referentCount: referents.length,
        referentNames: referents.map((r) => r.name),
        exclusion,
      };
    });
  }, [items, targetMarginPct, includeFallbackPrices, previewByUuid, overrideByUuid, serviceByUuid, manualExcluded, manualPrice, categoryRules]);

  const ready = useMemo(() => prepared.filter((p) => p.exclusion == null && p.price != null && p.price > 0), [prepared]);
  const pendingReadyCount = useMemo(() => ready.filter((p) => p.referentCount === 0).length, [ready]);
  const exclusionCounts = useMemo(() => {
    const counts: Record<ExclusionReason, number> = {
      launched: 0,
      no_weight: 0,
      no_warehouse: 0,
      no_price: 0,
      fallback_price: 0,
      no_referent: 0,
      manual: 0,
    };
    for (const p of prepared) if (p.exclusion) counts[p.exclusion] += 1;
    return counts;
  }, [prepared]);

  const noWarehouseUuids = useMemo(
    () => items.filter((it) => it.status !== 'LAUNCHED' && !it.warehouse && !hasNoWeight(it)).map((it) => it.stagingUuid),
    [items],
  );

  const serviceGroups = useMemo<ServiceGroup[]>(() => {
    const needing = items.filter((it) => {
      if (it.status === 'LAUNCHED' || !it.warehouse || hasNoWeight(it)) return false;
      const preview = previewByUuid.get(it.stagingUuid);
      const hasAutoService = !!preview && preview.categoryTypes.length > 0;
      return !hasAutoService && !serviceByUuid[it.stagingUuid];
    });
    const map = new Map<string, ServiceGroup>();
    for (const it of needing) {
      const suggested = suggestCategoryForItem(it, categoryRules);
      const first = it.codeEbat?.trim().charAt(0).toUpperCase() ?? '';
      const key = suggested?.category ?? (first ? `LETTER_${first}` : 'NO_CODE');
      const label = suggested
        ? `${suggested.label} (${suggested.prefix}…)`
        : first
          ? `Code ${first}… sans mapping`
          : 'Sans code eBat';
      const existing = map.get(key);
      if (existing) existing.uuids.push(it.stagingUuid);
      else map.set(key, { key, label, suggested: suggested?.category ?? '', uuids: [it.stagingUuid] });
    }
    return Array.from(map.values()).sort((a, b) => b.uuids.length - a.uuids.length);
  }, [items, previewByUuid, serviceByUuid, categoryRules]);

  const changeMargin = useCallback((raw: number) => setTargetMarginPct(clampMarginPct(raw)), []);

  const toggleManual = useCallback((id: string) => {
    setManualExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setPriceFor = useCallback((id: string, price: number | null) => {
    setManualPrice((prev) => {
      const next = { ...prev };
      if (price == null) delete next[id];
      else next[id] = price;
      return next;
    });
  }, []);

  const resolveWarehouse = useCallback(
    (it: NegotiationDialogItem): string | null => {
      const raw = (previewByUuid.get(it.stagingUuid)?.warehouse ?? it.warehouse)?.trim();
      return raw || null;
    },
    [previewByUuid],
  );

  const applyService = useCallback(
    async (uuids: string[], cat: NegotiationCategoryType) => {
      if (uuids.length === 0 || applying || sending) return;
      setApplying('service');
      setApplyError(null);
      try {
        const nextOverrides = { ...overrideByUuid };
        const nextServices = { ...serviceByUuid };
        const byKey = new Map<string, { warehouse: string; ids: string[] }>();
        for (const id of uuids) {
          const it = items.find((i) => i.stagingUuid === id);
          if (!it) continue;
          const warehouse = resolveWarehouse(it);
          if (!warehouse) continue;
          const key = `${warehouse}|${cat}`;
          const bucket = byKey.get(key);
          if (bucket) bucket.ids.push(id);
          else byKey.set(key, { warehouse, ids: [id] });
        }
        for (const { warehouse, ids } of byKey.values()) {
          const key = `${warehouse}|${cat}`;
          let cached = referentCache.current.get(key);
          if (!cached) {
            cached = await hubProductAnalyzerApi.eligibleReferents(warehouse, cat);
            referentCache.current.set(key, cached);
          }
          for (const id of ids) {
            nextOverrides[id] = cached;
            nextServices[id] = cat;
          }
        }
        setOverrideByUuid(nextOverrides);
        setServiceByUuid(nextServices);
      } catch (e) {
        setApplyError(apiErrorMessage(e, 'Impossible de récupérer les référents pour ce service'));
      } finally {
        setApplying(null);
      }
    },
    [applying, sending, items, overrideByUuid, serviceByUuid, resolveWarehouse],
  );

  const applyWarehouse = useCallback(
    async (uuids: string[], warehouse: string) => {
      if (uuids.length === 0 || applying || sending) return;
      const myGen = gen.current;
      const isStale = () => myGen !== gen.current;
      setApplying('warehouse');
      setApplyError(null);
      try {
        const succeeded: string[] = [];
        let failed = 0;
        for (let i = 0; i < uuids.length; i += WAREHOUSE_CONCURRENCY) {
          const slice = uuids.slice(i, i + WAREHOUSE_CONCURRENCY);
          const settled = await Promise.allSettled(slice.map((id) => hubProductAnalyzerApi.setWarehouse(id, warehouse)));
          settled.forEach((r, idx) => {
            const id = slice[idx];
            if (r.status === 'fulfilled' && id) succeeded.push(id);
            else failed += 1;
          });
          if (isStale()) return;
        }
        if (succeeded.length > 0) {
          const ok = new Set(succeeded);
          const updated = items.map((it) => (ok.has(it.stagingUuid) ? { ...it, warehouse } : it));
          setItems(updated);
          const data = await loadPreviewsAndOverrides(
            updated.filter((it) => ok.has(it.stagingUuid)),
            referentCache.current,
            isStale,
            categoryRulesRef.current,
          );
          if (!data || isStale()) return;
          setPreviewByUuid((prev) => new Map([...prev, ...data.previews]));
          setOverrideByUuid((prev) => ({ ...prev, ...data.overrides }));
          setServiceByUuid((prev) => ({ ...prev, ...data.services }));
          refreshAnalyzerData();
        }
        if (failed > 0) setApplyError(`${failed} produit${failed > 1 ? 's' : ''} non rattaché${failed > 1 ? 's' : ''} à l'entrepôt.`);
      } catch (e) {
        setApplyError(apiErrorMessage(e, "Impossible de rattacher les produits à l'entrepôt"));
      } finally {
        setApplying(null);
      }
    },
    [applying, sending, items],
  );

  const send = useCallback(async () => {
    if (ready.length === 0 || sending) return;
    setSending(true);
    setSendError(null);
    const aggregated: BulkAssignResult = { assigned: [], failed: [] };
    setSendProgress({ done: 0, total: ready.length });
    try {
      for (let i = 0; i < ready.length; i += ASSIGN_CHUNK) {
        const slice = ready.slice(i, i + ASSIGN_CHUNK);
        const payload: AssignNegotiationItem[] = slice.map((p) => ({
          stagingUuid: p.item.stagingUuid,
          requestedMinPriceHT: p.price as number,
          ...(p.categoryOverride ? { categoryTypeOverride: p.categoryOverride } : {}),
        }));
        const res = await hubProductAnalyzerApi.assignNegotiationBulk({ items: payload });
        aggregated.assigned.push(...res.assigned);
        aggregated.failed.push(...res.failed);
        setSendProgress({ done: Math.min(i + slice.length, ready.length), total: ready.length });
      }
      setResult(aggregated);
      void Haptics.notificationAsync(
        aggregated.failed.length > 0 ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
      if (source === 'selection') clearSelection();
      refreshAnalyzerData();
    } catch (e) {
      setSendError(apiErrorMessage(e, "Erreur lors de l'envoi en négociation"));
    } finally {
      setSending(false);
    }
  }, [ready, sending, source]);

  return {
    loading,
    loadProgress,
    loadError,
    capped,
    items,
    prepared,
    ready,
    pendingReadyCount,
    exclusionCounts,
    noWarehouseUuids,
    serviceGroups,
    targetMarginPct,
    includeFallbackPrices,
    setIncludeFallbackPrices,
    changeMargin,
    toggleManual,
    setPriceFor,
    applying,
    applyError,
    applyService,
    applyWarehouse,
    sending,
    sendError,
    sendProgress,
    result,
    send,
  };
}
