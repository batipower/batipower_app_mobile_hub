import { useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Barcode, Info, ScanLine } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { hubProductAnalyzerApi, type ClaimedReserveItem, type ReserveTrack } from '@/api/hubProductAnalyzer';
import { FilterPill } from '@/components/sheet/FilterPill';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { ChoiceField, LinkRow } from '@/features/pricing/components/FilterControls';
import { openWebPage } from '@/lib/openWeb';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { ManufacturerSearchResult, Warehouse } from '@/types/hubProductAnalyzer';

import { useDistributors } from '../hooks/useDistributors';
import { useAffaires } from '../hooks/useStagingList';
import { patchLauncherDraft, resetLauncherDraft, useLauncherDraft } from '../launcherStore';
import { getReserveClaimToken } from '../lib/claim-token';
import { apiErrorMessage } from '../lib/errors';
import { useSkipWeight } from '../lib/preferences';
import {
  dismissThen,
  openPaLive,
  openPaPicker,
  openPaQueue,
  openPaScan,
  type PaLauncherParams,
} from '../navigation';
import { PA_RESERVE_KEY } from '../queryKeys';
import { useAnalyzerEngine } from '../socket/AnalyzerSocketProvider';
import { SOCKET_DOWN_MESSAGE, type AnalyzeRequest, type QueueSeed } from '../socket/types';
import type { ReserveStats } from '../lib/analyze-types';

type Mode = 'ean' | 'ebat' | 'manufacturer' | 'reserve';

const MODES: { key: Mode; label: string }[] = [
  { key: 'ean', label: 'Code EAN' },
  { key: 'ebat', label: 'Code eBat' },
  { key: 'manufacturer', label: 'Réf. fabricant' },
  { key: 'reserve', label: 'Réserve' },
];

const EAN_PATTERN = /^\d{8,14}$/;

function parsePrice(text: string): number | undefined {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Feuille « Analyser » : quatre entrées (EAN, code eBat, référence fabricant, réserve), le
 * fournisseur / entrepôt, l'affaire et l'option « Ignorer la saisie du poids ». Une analyse
 * unitaire ouvre l'écran live ; la réserve lance une file.
 */
export function LauncherSheet() {
  const styles = useStyles();
  const t = useTheme();
  const engine = useAnalyzerEngine();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<PaLauncherParams>();
  const draft = useLauncherDraft();
  const { distributors, withWarehouse, byId } = useDistributors();
  const { data: affaires } = useAffaires();
  const [skipWeight, setSkipWeight] = useSkipWeight();

  const initialMode: Mode =
    params.mode ?? (params.ean ? 'ean' : params.code ? 'ebat' : 'ean');
  const [mode, setMode] = useState<Mode>(initialMode);
  const [ean, setEan] = useState(params.ean ?? '');
  const [code, setCode] = useState(params.code ?? '');
  const [price, setPrice] = useState(params.obtainedPriceHT ?? '');
  const [mfrRef, setMfrRef] = useState('');
  const [mfrResult, setMfrResult] = useState<ManufacturerSearchResult | null>(null);
  const [mfrLoading, setMfrLoading] = useState(false);
  const [distributorId, setDistributorId] = useState('');
  const [busy, setBusy] = useState(false);

  // Réserve
  const [track, setTrack] = useState<'STANDARD' | 'DISTRIBUTOR_CLEARANCE'>('STANDARD');
  const [count, setCount] = useState('30');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [reserveDistributorId, setReserveDistributorId] = useState('');

  const opportunityUuid = params.opportunityUuid || null;

  // Entrepôt par défaut : Dombasle (comme le web), sinon le premier distributeur interrogeable.
  useEffect(() => {
    if (distributorId || withWarehouse.length === 0) return;
    const preferred = withWarehouse.find((d) => d.ebatproWarehouse === 'DOMBASLE') ?? withWarehouse[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valeur par défaut une fois la liste chargée
    if (preferred) setDistributorId(preferred.id);
  }, [withWarehouse, distributorId]);

  // EAN lu par le scanner : repris puis consommé.
  useEffect(() => {
    if (!draft.scannedEan) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- consomme l'EAN lu par le scanner (store externe)
    setEan(draft.scannedEan);
    setMode('ean');
    patchLauncherDraft({ scannedEan: null });
  }, [draft.scannedEan]);

  // Brouillon propre à chaque ouverture : l'affaire choisie la fois précédente ne reste pas.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    resetLauncherDraft();
  }, []);

  const reserve = useQuery({
    queryKey: [...PA_RESERVE_KEY, 'stats'],
    queryFn: async ({ signal }) => {
      const res = await hubProductAnalyzerApi.listReserve(1, signal);
      return (res.stats as ReserveStats | undefined) ?? { totalEnAttente: res.total ?? 0 };
    },
    enabled: mode === 'reserve',
    staleTime: 10_000,
  });

  const selectedDistributor = byId(distributorId);
  const warehouse = (selectedDistributor?.ebatproWarehouse ?? undefined) as Warehouse | undefined;
  const realDistributorId = distributorId && !distributorId.startsWith('fallback-') ? distributorId : undefined;
  const affaireName = draft.affaireId
    ? (affaires?.find((a) => a.uuid === draft.affaireId)?.name ?? 'Affaire')
    : 'Aucune';
  const reserveAffaireName = draft.reserveAffaireId
    ? (affaires?.find((a) => a.uuid === draft.reserveAffaireId)?.name ?? 'Affaire')
    : 'Toutes';

  const eanTrim = ean.trim();
  const eanError = eanTrim && !EAN_PATTERN.test(eanTrim) ? 'Un EAN comporte 8 à 14 chiffres.' : undefined;

  const voie = reserve.data?.parVoie?.[track];
  const waiting = voie?.enAttente ?? (track === 'STANDARD' ? (reserve.data?.totalEnAttente ?? 0) : 0);

  /** Garde commune : refuse si une file ou une analyse occupe déjà le serveur. */
  const canStartSingle = (): boolean => {
    const state = engine.getState();
    if (state.queue.running) {
      toast.error("Une file d'analyses est en cours : attendez sa fin ou arrêtez-la.");
      return false;
    }
    if (state.single.phase === 'pending' || state.single.phase === 'running') {
      toast('Une analyse est déjà en cours.');
      dismissThen(openPaLive);
      return false;
    }
    return true;
  };

  const startSingle = (request: AnalyzeRequest) => {
    if (!canStartSingle()) return;
    engine.resetSingle();
    if (!engine.startSingle(request)) {
      toast.error(SOCKET_DOWN_MESSAGE);
      engine.resetSingle();
      return;
    }
    dismissThen(openPaLive);
  };

  const common = {
    skipWeight,
    affaireId: draft.affaireId || null,
    warehouse: warehouse ?? null,
    opportunityUuid,
  };

  const startEan = () => {
    if (!eanTrim || eanError) return;
    startSingle({
      ...common,
      label: `EAN ${eanTrim}`,
      start: {
        type: 'ean',
        payload: {
          ean: eanTrim,
          warehouse,
          distributorId: realDistributorId,
          estimatedBuyPriceHT: parsePrice(price),
        },
      },
    });
  };

  const startEbat = (codeEbat: string, wh: Warehouse | undefined, distributor?: string) => {
    startSingle({
      ...common,
      warehouse: wh ?? common.warehouse,
      label: codeEbat,
      start: { type: 'ebat', payload: { codeEbat, warehouse: wh, distributorId: distributor } },
    });
  };

  const searchManufacturer = async () => {
    const ref = mfrRef.trim();
    if (!ref) return;
    setMfrLoading(true);
    setMfrResult(null);
    try {
      setMfrResult(await hubProductAnalyzerApi.searchManufacturerRef(ref));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Recherche impossible'));
    } finally {
      setMfrLoading(false);
    }
  };

  const claimReserve = async () => {
    const n = Math.max(1, Math.min(500, parseInt(count, 10) || 0));
    if (!n) return;
    const state = engine.getState();
    if (state.queue.running || state.single.phase === 'pending' || state.single.phase === 'running') {
      toast.error('Une analyse est déjà en cours.');
      return;
    }
    setBusy(true);
    try {
      const claimToken = await getReserveClaimToken();
      const res = await hubProductAnalyzerApi.claimReserve({
        count: n,
        affaireId: draft.reserveAffaireId || undefined,
        priorityOnly: priorityOnly || undefined,
        track: track as ReserveTrack,
        distributorId: track === 'DISTRIBUTOR_CLEARANCE' ? reserveDistributorId || undefined : undefined,
        claimToken,
      });
      const claimed: ClaimedReserveItem[] = Array.isArray(res) ? res : (res.items ?? []);
      if (claimed.length === 0) {
        toast('La réserve est vide pour ce filtre.');
        void queryClient.invalidateQueries({ queryKey: PA_RESERVE_KEY });
        return;
      }
      const seeds: QueueSeed[] = claimed.map((it) => {
        const isInternal = !!it.codeEbat;
        const clearance = it.track === 'DISTRIBUTOR_CLEARANCE';
        return {
          ref: it.codeEbat || it.ean || '?',
          label: it.designation,
          refType: isInternal ? 'ebatpro' : 'ean',
          code: it.codeEbat || it.ean || '',
          // Déstockage : l'entrepôt vient du distributeur du lot, jamais d'un repli Dombasle.
          warehouse: isInternal
            ? ((it.warehouse || (clearance ? null : (warehouse ?? 'DOMBASLE'))) as Warehouse | null)
            : null,
          distributorId: clearance ? (it.distributorId ?? null) : null,
          forceCatalogue: !!it.forceCatalogue,
          reserveUuid: it.uuid,
          affaireId: it.affaireId || null,
        };
      });
      if (!engine.startQueue(seeds, 'reserve')) {
        // Démarrage impossible (serveur d'analyse injoignable) : on rend les lignes prises.
        await hubProductAnalyzerApi
          .releaseReserve(claimToken)
          .catch(() => hubProductAnalyzerApi.markReserveFailed(claimed.map((c) => c.uuid), claimToken))
          .catch(() => undefined);
        toast.error(SOCKET_DOWN_MESSAGE);
        return;
      }
      dismissThen(openPaQueue);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Impossible de récupérer la réserve'));
    } finally {
      setBusy(false);
    }
  };

  const footer =
    mode === 'ean' ? (
      <Button label="Analyser" disabled={!eanTrim || !!eanError} onPress={startEan} />
    ) : mode === 'ebat' ? (
      <Button
        label="Analyser"
        disabled={!code.trim()}
        onPress={() => startEbat(code.trim(), warehouse, realDistributorId)}
      />
    ) : mode === 'manufacturer' ? (
      <Button
        label="Rechercher"
        loading={mfrLoading}
        disabled={!mfrRef.trim()}
        onPress={() => void searchManufacturer()}
      />
    ) : (
      <Button
        label={`Lancer ${Math.max(1, parseInt(count, 10) || 1)} analyse${(parseInt(count, 10) || 1) > 1 ? 's' : ''}`}
        loading={busy}
        disabled={!reserve.data || waiting === 0}
        onPress={() => void claimReserve()}
      />
    );

  const supplierField = (
    <ChoiceField
      label="Fournisseur / entrepôt"
      options={withWarehouse.map((d) => ({
        value: d.id,
        label: d.ready ? d.name : `${d.name} (non paramétré)`,
      }))}
      value={distributorId}
      onChange={setDistributorId}
    />
  );

  return (
    <SheetScreen title="Analyser un produit" closeLabel="Fermer" footer={footer}>
      {opportunityUuid ? (
        <View style={styles.notice}>
          <Info size={16} color={t.info} />
          <Text style={styles.noticeText}>
            Analyse depuis une opportunité : elle sera marquée « lancée » après le lancement du produit.
          </Text>
        </View>
      ) : null}

      <View style={styles.modes}>
        {MODES.map((m) => (
          <FilterPill
            key={m.key}
            label={m.label}
            state={mode === m.key ? 'on' : 'off'}
            onPress={() => setMode(m.key)}
          />
        ))}
      </View>

      {mode === 'ean' ? (
        <SheetSection title="Code EAN">
          <View style={styles.eanRow}>
            <View style={styles.flex}>
              <TextField
                label="Code EAN"
                value={ean}
                onChangeText={(v) => setEan(v.replace(/\D/g, '').slice(0, 14))}
                placeholder="3588590130219"
                keyboardType="number-pad"
                maxLength={14}
                error={eanError}
                returnKeyType="go"
                onSubmitEditing={startEan}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scanner un code-barres"
              onPress={openPaScan}
              style={({ pressed }) => [styles.scan, pressed && { opacity: 0.8 }]}
            >
              <ScanLine size={22} color={t.onAccent} />
            </Pressable>
          </View>
          {supplierField}
          <TextField
            label="PA estimé HT (facultatif)"
            value={price}
            onChangeText={setPrice}
            placeholder="0,00"
            keyboardType="decimal-pad"
            icon={Barcode}
          />
          <Text style={styles.hint}>
            Analyse sans référence eBatPro : l’étape ERP est ignorée. Le PA peut être saisi maintenant ou
            plus tard.
          </Text>
        </SheetSection>
      ) : null}

      {mode === 'ebat' ? (
        <SheetSection title="Code eBat">
          <TextField
            label="Code eBat"
            value={code}
            onChangeText={setCode}
            placeholder="FLV-000123"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => code.trim() && startEbat(code.trim(), warehouse, realDistributorId)}
          />
          {supplierField}
        </SheetSection>
      ) : null}

      {mode === 'manufacturer' ? (
        <SheetSection title="Référence fabricant">
          <TextField
            label="Référence fabricant"
            value={mfrRef}
            onChangeText={(v) => {
              setMfrRef(v);
              setMfrResult(null);
            }}
            placeholder="SOMFY-1234"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void searchManufacturer()}
          />
          {mfrResult ? (
            mfrResult.error ? (
              <Text style={[styles.hint, { color: t.danger }]}>{mfrResult.error}</Text>
            ) : !mfrResult.found ? (
              <Text style={styles.hint}>Aucun code trouvé pour {mfrResult.manufacturerRef}.</Text>
            ) : (
              <View style={styles.results}>
                <Text style={styles.hint}>Choisissez l’entrepôt à analyser :</Text>
                {(['FLEVY', 'DOMBASLE'] as const).map((wh) => {
                  const found = wh === 'FLEVY' ? mfrResult.codeFlevy : mfrResult.codeDombasle;
                  const name = distributors.find((d) => d.ebatproWarehouse === wh)?.name ?? wh;
                  return (
                    <View key={wh} style={styles.resultRow}>
                      <View style={styles.flex}>
                        <Text style={styles.resultWh}>{name}</Text>
                        <Text style={styles.resultCode}>{found ?? 'Non référencé'}</Text>
                      </View>
                      <Button
                        label="Analyser"
                        disabled={!found}
                        onPress={() => found && startEbat(found, wh)}
                      />
                    </View>
                  );
                })}
              </View>
            )
          ) : null}
        </SheetSection>
      ) : null}

      {mode === 'reserve' ? (
        <SheetSection title="Réserve d'analyses">
          <ChoiceField
            label="Voie"
            options={[
              { value: 'STANDARD', label: 'Produits lambda' },
              { value: 'DISTRIBUTOR_CLEARANCE', label: 'Déstockage' },
            ]}
            value={track}
            onChange={setTrack}
          />
          <View style={styles.counter}>
            <View style={[styles.counterDot, { backgroundColor: t.accent }]} />
            <Text style={styles.counterText}>
              {reserve.isPending ? '…' : waiting} en attente
              {reserve.data?.postesActifs
                ? ` · ${reserve.data.postesActifs} poste${reserve.data.postesActifs > 1 ? 's' : ''} actif${reserve.data.postesActifs > 1 ? 's' : ''}`
                : ''}
            </Text>
          </View>
          {track === 'DISTRIBUTOR_CLEARANCE' ? (
            <ChoiceField
              label="Distributeur"
              options={[
                { value: '', label: 'Tous' },
                ...(reserve.data?.parDistributeur ?? []).map((d) => ({
                  value: d.distributorId,
                  label: `${d.name ?? d.distributorId} (${d.enAttente})`,
                })),
              ]}
              value={reserveDistributorId}
              onChange={setReserveDistributorId}
            />
          ) : null}
          <TextField
            label="Nombre à lancer"
            value={count}
            onChangeText={(v) => setCount(v.replace(/\D/g, '').slice(0, 3))}
            keyboardType="number-pad"
            returnKeyType="done"
          />
          <LinkRow
            label="Affaire"
            value={reserveAffaireName}
            onPress={() => openPaPicker('reserve-affaire')}
          />
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.switchLabel}>Prioritaires uniquement</Text>
              {reserve.data?.totalPrioritaires != null ? (
                <Text style={styles.hint}>{reserve.data.totalPrioritaires} prioritaires</Text>
              ) : null}
            </View>
            <Switch
              value={priorityOnly}
              onValueChange={setPriorityOnly}
              trackColor={{ true: t.accent }}
            />
          </View>
          <Text style={styles.hint}>
            La file analyse un produit à la fois, sans demander le poids. L’import d’un fichier de
            déstockage se fait sur le web.
          </Text>
        </SheetSection>
      ) : null}

      {mode !== 'reserve' ? (
        <SheetSection title="Options">
          <LinkRow
            label="Rattacher à l'affaire"
            value={affaireName}
            onPress={() => openPaPicker('launch-affaire')}
          />
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.switchLabel}>Ignorer la saisie du poids</Text>
              <Text style={styles.hint}>
                Poids à 0 g, à renseigner ensuite sur la fiche. Mémorisé sur cet appareil.
              </Text>
            </View>
            <Switch value={skipWeight} onValueChange={setSkipWeight} trackColor={{ true: t.accent }} />
          </View>
        </SheetSection>
      ) : null}

      <SheetSection title="Sur le web">
        <LinkRow
          label="Importer un fichier Excel"
          value="Ouvrir sur le web"
          onPress={() => void openWebPage('/hub/product-analyzer')}
        />
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  eanRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  scan: {
    width: hitTarget + 4,
    height: hitTarget + 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
  },
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: withAlpha(t.info, 0.12),
  },
  noticeText: { flex: 1, fontSize: fontSize.xs, color: t.text, lineHeight: 17 },
  results: { gap: spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  resultWh: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  resultCode: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  counterDot: { width: 8, height: 8, borderRadius: 4 },
  counterText: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
}));
