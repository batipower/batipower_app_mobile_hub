import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import { PickerList } from '@/components/sheet/PickerList';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { SupplierCodeCandidate, SupplierCodeResult } from '@/types/hubProductAnalyzer';

import { assignItemsToAffaire, confirmDialog, refreshAnalyzerData } from '../../bulkActions';
import { useDistributors } from '../../hooks/useDistributors';
import { useAffaires } from '../../hooks/useStagingList';
import { useMarketplaceViability, useStagingDetail } from '../../hooks/useStagingDetail';
import { apiErrorMessage } from '../../lib/errors';
import { resolveCatalogueRef, plannedDepDistributorIds } from '../../lib/helpers';
import { searchInternalCodesByEan } from '../../lib/attach-internal-code';
import { snapshotOf, num } from '../../lib/snapshot';
import { SUPPLIER_CODE_STATUS_CFG, applyOfferToResult, supplierRowKey, type SupplierCodeTone } from '../../lib/supplier-codes';
import { buildSupplierRows } from '../../lib/supplier-rows';
import { PA_ROOT, paStagingKey } from '../../queryKeys';
import { parseDecimal, isPositiveDecimal } from './formKit';

// ─── Affaire d'un produit ────────────────────────────────────────────────────

/** Rattache le produit à une affaire existante, ou en crée une nouvelle. */
export function ItemAffaireEdit({ uuid }: { uuid: string }) {
  const styles = useStyles();
  const { data: item } = useStagingDetail(uuid);
  const affaires = useAffaires();
  const [busy, setBusy] = useState(false);
  const items = useMemo(
    () =>
      (affaires.data ?? []).map((a) => ({
        value: a.uuid,
        label: a.distributorName ? `${a.name} · ${a.distributorName}` : a.name,
      })),
    [affaires.data],
  );
  const linked = (item?.affaireLinks ?? []).map((l) => l.affaireId);

  return (
    <PickerList
      title="Ajouter à une affaire"
      items={items}
      selected={linked}
      loading={affaires.isPending}
      error={affaires.error}
      multiple={false}
      onRetry={() => void affaires.refetch()}
      onToggle={(value) => {
        const affaire = affaires.data?.find((a) => a.uuid === value);
        if (!affaire || !item || busy) return;
        setBusy(true);
        void assignItemsToAffaire([item], affaire).then((ok) => {
          setBusy(false);
          if (ok) router.back();
        });
      }}
      footer={
        <View style={styles.footer}>
          <Button
            label="Nouvelle affaire"
            variant="outline"
            leadingIcon={<Plus size={16} color="#888" />}
            onPress={() =>
              router.replace({ pathname: '/hub/product-analyzer/editer/[kind]', params: { kind: 'new-affaire', uuid } })
            }
          />
        </View>
      }
    />
  );
}

// ─── DEP planifiée par fournisseur ───────────────────────────────────────────

export function DepEdit({ uuid }: { uuid: string }) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { data: item } = useStagingDetail(uuid);
  const { distributors } = useDistributors();
  const [planned, setPlanned] = useState<string[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const current = planned ?? plannedDepDistributorIds(item);

  const toggle = async (id: string, next: boolean) => {
    const before = current;
    setPlanned(next ? [...before, id] : before.filter((x) => x !== id));
    setSaving(id);
    try {
      await hubProductAnalyzerApi.setPlannedDep(uuid, id, next);
      refreshAnalyzerData();
      await queryClient.invalidateQueries({ queryKey: paStagingKey(uuid) });
    } catch (err) {
      setPlanned(before);
      toast.error(apiErrorMessage(err, 'Modification de la DEP impossible'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <SheetScreen title="DEP planifiée" closeLabel="OK">
      <SheetSection title="Par fournisseur">
        {distributors.map((d) => (
          <View key={d.id} style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>{d.name}</Text>
              <Text style={styles.hint}>
                {current.includes(d.id) ? 'DEP planifiée : prix fin de vie' : 'Pas de DEP'}
              </Text>
            </View>
            {saving === d.id ? <ActivityIndicator color={t.accent} /> : null}
            <Switch
              value={current.includes(d.id)}
              disabled={saving !== null}
              onValueChange={(v) => void toggle(d.id, v)}
              trackColor={{ true: t.accent }}
              accessibilityLabel={`DEP ${d.name}`}
            />
          </View>
        ))}
      </SheetSection>
      <Text style={styles.hint}>
        La DEP signale un produit en fin de vie : la négociation expose au fournisseur un prix réduit. Flevy et Dombasle
        restent exclusifs entre eux.
      </Text>
    </SheetScreen>
  );
}

// ─── Codes fournisseurs ──────────────────────────────────────────────────────

const toneColor = (tone: SupplierCodeTone, t: ReturnType<typeof useTheme>) =>
  tone === 'success' ? t.success : tone === 'warning' ? t.warning : tone === 'danger' ? t.danger : t.textMuted;

export function SupplierCodesEdit({ uuid }: { uuid: string }) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const detail = useStagingDetail(uuid);
  const item = detail.data;
  const { distributors } = useDistributors();
  const [results, setResults] = useState<SupplierCodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string, string>>({});

  const rows = buildSupplierRows(item?.distributorOffers, distributors, {
    codeEbat: item?.codeEbat,
    warehouse: item?.warehouse,
  }).filter((r) => r.offer);

  const refreshItem = async () => {
    refreshAnalyzerData();
    await queryClient.invalidateQueries({ queryKey: paStagingKey(uuid) });
    return (await detail.refetch()).data;
  };

  const search = async () => {
    setSearching(true);
    try {
      const { response } = await searchInternalCodesByEan({ stagingUuid: uuid }, { refreshExisting: false });
      if (response.reason === 'NO_EAN') {
        toast.error("Pas d'EAN : recherche impossible. Renseignez l'EAN d'abord.");
      } else {
        setResults(response.suppliers);
        await refreshItem();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Recherche impossible'));
    } finally {
      setSearching(false);
    }
  };

  const attach = async (row: SupplierCodeResult, code: string) => {
    const key = supplierRowKey(row);
    setBusyKey(key);
    try {
      await hubProductAnalyzerApi.attachEbatCode(uuid, {
        codeEbat: code,
        distributorId: row.distributorId,
        distributorWarehouseId: row.distributorWarehouseId,
        refreshStocks: true,
      });
      const fresh = await refreshItem();
      setResults((prev) =>
        prev ? prev.map((r) => (supplierRowKey(r) === key ? applyOfferToResult(r, fresh?.distributorOffers, code) : r)) : prev,
      );
      toast.success('Code rattaché');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Rattachement impossible'));
    } finally {
      setBusyKey(null);
    }
  };

  const remove = async (distributorId: string, distributorWarehouseId: string | null | undefined, name: string) => {
    const ok = await confirmDialog('Retirer le code ?', `Le code interne de ${name} sera détaché de ce produit.`, 'Retirer', true);
    if (!ok) return;
    setBusyKey(`rm:${distributorId}`);
    try {
      await hubProductAnalyzerApi.removeEbatCode(uuid, distributorId, distributorWarehouseId ?? undefined);
      await refreshItem();
      toast.success('Code retiré');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Impossible de retirer le code'));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <SheetScreen
      title="Codes fournisseurs"
      closeLabel="Fermer"
      footer={
        <Button
          label="Rechercher chez tous les fournisseurs"
          leadingIcon={<Search size={16} color={t.onAccent} />}
          loading={searching}
          disabled={!item?.ean}
          onPress={() => void search()}
        />
      }
    >
      {!item?.ean ? <Text style={styles.warn}>Pas d’EAN : la recherche automatique est impossible.</Text> : null}

      <SheetSection title="Codes posés">
        {rows.length === 0 ? <Text style={styles.hint}>Aucun code interne rattaché.</Text> : null}
        {rows.map((row) => (
          <View key={row.key} style={styles.codeRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>
                {row.distributorName}
                {row.warehouseName ? ` · ${row.warehouseName}` : ''}
              </Text>
              <Text style={styles.mono}>{row.code ?? 'Code manquant'}</Text>
              <Text style={styles.hint}>PA {formatEuro(row.purchasePriceHT)}</Text>
            </View>
            {row.offer && row.code ? (
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Retirer le code ${row.distributorName}`}
                disabled={busyKey !== null}
                onPress={() => void remove(row.distributorId, row.offer?.distributorWarehouseId, row.distributorName)}
              >
                {busyKey === `rm:${row.distributorId}` ? (
                  <ActivityIndicator color={t.danger} />
                ) : (
                  <Trash2 size={18} color={t.danger} />
                )}
              </Pressable>
            ) : null}
          </View>
        ))}
      </SheetSection>

      {results ? (
        <SheetSection title="Résultat de la recherche">
          {results.map((r) => {
            const key = supplierRowKey(r);
            const cfg = SUPPLIER_CODE_STATUS_CFG[r.status];
            const color = toneColor(cfg.tone, t);
            const canManual = r.status === 'NOT_FOUND' || r.status === 'ERROR' || r.status === 'AMBIGUOUS';
            return (
              <View key={key} style={[styles.result, { borderColor: withAlpha(color, 0.4) }]}>
                <View style={styles.resultHead}>
                  <Text style={[styles.label, styles.flex]} numberOfLines={1}>
                    {r.distributorName} · {r.warehouseName}
                  </Text>
                  <Text style={[styles.badge, { color, backgroundColor: withAlpha(color, 0.14) }]}>{cfg.label}</Text>
                </View>
                {r.code ? <Text style={styles.mono}>{r.code}</Text> : null}
                {r.message ? <Text style={styles.hint}>{r.message}</Text> : null}
                {r.status === 'AMBIGUOUS'
                  ? (r.candidates ?? []).map((c: SupplierCodeCandidate) => (
                      <Pressable
                        key={c.code}
                        disabled={busyKey !== null}
                        onPress={() => void attach(r, c.code)}
                        accessibilityRole="button"
                        accessibilityLabel={`Rattacher ${c.code}`}
                        style={({ pressed }) => [styles.candidate, pressed && { backgroundColor: t.cardPressed }]}
                      >
                        <Text style={styles.mono}>{c.code}</Text>
                        <Text style={styles.hint} numberOfLines={2}>
                          {c.name} · {c.brand} · PA {formatEuro(c.purchasePriceHT)}
                        </Text>
                      </Pressable>
                    ))
                  : null}
                {canManual ? (
                  <View style={styles.manual}>
                    <TextInput
                      value={manual[key] ?? ''}
                      onChangeText={(v) => setManual((m) => ({ ...m, [key]: v }))}
                      placeholder="Saisir un code interne"
                      placeholderTextColor={t.textFaint}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      style={styles.input}
                      accessibilityLabel={`Code interne ${r.distributorName}`}
                    />
                    <Button
                      label="Rattacher"
                      variant="outline"
                      loading={busyKey === key}
                      disabled={!(manual[key] ?? '').trim() || busyKey !== null}
                      onPress={() => void attach(r, (manual[key] ?? '').trim())}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </SheetSection>
      ) : null}
    </SheetScreen>
  );
}

// ─── Déployer sur les marketplaces (produit lancé) ───────────────────────────

type MpKey = 'amazon' | 'manomano' | 'leroymerlin';
const MP_ROWS: { key: MpKey; label: string; hint: string }[] = [
  { key: 'amazon', label: 'Amazon France', hint: 'Offre FBM au prix TTC saisi (BuyBox par défaut)' },
  { key: 'manomano', label: 'ManoMano', hint: 'Offre France au prix TTC saisi' },
  { key: 'leroymerlin', label: 'Leroy Merlin', hint: 'Offre Mirakl au prix TTC saisi' },
];

export function MarketplacesEdit({ uuid }: { uuid: string }) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { data: item } = useStagingDetail(uuid);
  const viability = useMarketplaceViability(uuid, true);
  const snap = item ? snapshotOf(item) : null;
  const reference = item ? resolveCatalogueRef(item) : null;

  const defaults: Record<MpKey, string> = useMemo(() => {
    const entry = (p: string) => viability.data?.entries.find((e) => e.platform === p)?.priceTTC;
    const amazon = num(snap?.tg?.pvTTC) ?? num(snap?.az?.buyboxPriceTTC);
    const fmt = (n: number | null | undefined) => (n != null ? String(n).replace('.', ',') : '');
    return {
      amazon: fmt(amazon),
      manomano: fmt(entry('MANOMANO')),
      leroymerlin: fmt(entry('LEROY_MERLIN')),
    };
  }, [snap, viability.data]);

  const [enabled, setEnabled] = useState<Record<MpKey, boolean>>({ amazon: true, manomano: false, leroymerlin: false });
  const [prices, setPrices] = useState<Partial<Record<MpKey, string>>>({});
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<{ label: string; ok: boolean; text: string }[]>([]);
  const priceOf = (k: MpKey) => prices[k] ?? defaults[k];

  const deploy = async () => {
    if (!reference) {
      toast.error('Référence catalogue introuvable : relancez après le lancement.');
      return;
    }
    const todo = MP_ROWS.filter((r) => enabled[r.key]);
    if (todo.length === 0) {
      toast.error('Choisissez au moins une marketplace.');
      return;
    }
    for (const r of todo) {
      if (r.key !== 'amazon' && !isPositiveDecimal(priceOf(r.key))) {
        toast.error(`Prix TTC requis pour ${r.label}.`);
        return;
      }
      if (r.key === 'amazon' && priceOf('amazon') && !isPositiveDecimal(priceOf('amazon'))) {
        toast.error('Prix Amazon invalide.');
        return;
      }
    }
    setRunning(true);
    const out: { label: string; ok: boolean; text: string }[] = [];
    for (const r of todo) {
      try {
        const price = priceOf(r.key) ? parseDecimal(priceOf(r.key)) : undefined;
        if (r.key === 'amazon') await hubProductAnalyzerApi.createAmazonOffer({ reference, ...(price ? { priceTTC: price } : {}) });
        else if (r.key === 'manomano') await hubProductAnalyzerApi.createManomanoOffer({ reference, priceTTC: price as number });
        else await hubProductAnalyzerApi.createLeroyMerlinOffer({ reference, priceTTC: price as number });
        out.push({ label: r.label, ok: true, text: price ? `Offre créée à ${formatEuro(price)} TTC` : 'Offre créée' });
      } catch (err) {
        out.push({ label: r.label, ok: false, text: apiErrorMessage(err, 'Erreur') });
      }
    }
    setLines(out);
    setRunning(false);
    void queryClient.invalidateQueries({ queryKey: PA_ROOT });
    if (out.every((l) => l.ok)) toast.success('Offres déployées');
    else toast.error('Déploiement partiel : voir le détail');
  };

  return (
    <SheetScreen
      title="Marketplaces"
      closeLabel="Fermer"
      footer={<Button label="Déployer" loading={running} disabled={!reference} onPress={() => void deploy()} />}
    >
      {!reference ? <Text style={styles.warn}>Référence catalogue introuvable pour ce produit.</Text> : null}
      <SheetSection title="Offres à créer">
        {MP_ROWS.map((r) => (
          <View key={r.key} style={styles.mpRow}>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.hint}>{r.hint}</Text>
              </View>
              <Switch
                value={enabled[r.key]}
                onValueChange={(v) => setEnabled((e) => ({ ...e, [r.key]: v }))}
                trackColor={{ true: t.accent }}
                accessibilityLabel={r.label}
              />
            </View>
            {enabled[r.key] ? (
              <TextInput
                value={priceOf(r.key)}
                onChangeText={(v) => setPrices((p) => ({ ...p, [r.key]: v }))}
                placeholder="Prix TTC (€)"
                placeholderTextColor={t.textFaint}
                keyboardType="decimal-pad"
                style={styles.input}
                accessibilityLabel={`Prix TTC ${r.label}`}
              />
            ) : null}
          </View>
        ))}
      </SheetSection>
      {lines.length > 0 ? (
        <SheetSection title="Résultat">
          {lines.map((l) => (
            <Text key={l.label} style={[styles.hint, { color: l.ok ? t.success : t.danger, fontWeight: '700' }]}>
              {l.label} : {l.text}
            </Text>
          ))}
        </SheetSection>
      ) : null}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  warn: { fontSize: fontSize.sm, fontWeight: '600', color: t.warning },
  mono: { fontFamily: monoFontFamily, fontSize: 12, color: t.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  result: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, backgroundColor: t.surface },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, overflow: 'hidden' },
  candidate: {
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  manual: { gap: spacing.sm },
  input: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    fontSize: fontSize.sm,
    color: t.text,
  },
  mpRow: { gap: spacing.sm },
}));
