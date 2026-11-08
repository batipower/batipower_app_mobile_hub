import { memo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Check, CheckCircle2, Circle, Clock, Handshake, Info, Send } from 'lucide-react-native';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { FilterPill } from '@/components/sheet/FilterPill';
import { Button } from '@/components/ui';
import { ChoiceField } from '@/features/pricing/components/FilterControls';
import { formatEuro, formatInteger } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { useDistributors } from '../hooks/useDistributors';
import { useStagingDetail } from '../hooks/useStagingDetail';
import { NEGOTIATION_CATEGORY_TYPES, type NegotiationCategoryType } from '../lib/negotiation-api';
import { MARGIN_PRESETS } from '../lib/negotiation-items';
import {
  EXCLUSION_LABEL,
  VOLUME_WARN_THRESHOLD,
  useNegotiationDraft,
  type ExclusionReason,
  type PreparedItem,
} from '../negotiation/useNegotiationDraft';
import { backToHistory, openPaEdit, type PaNegoSource } from '../navigation';

type Step = 1 | 2 | 3;
const STEP_LABELS: Record<Step, string> = { 1: 'Produits', 2: 'Référents', 3: 'Envoi' };

function plural(n: number, one: string, many = `${one}s`) {
  return `${formatInteger(n)} ${n > 1 ? many : one}`;
}

function parseSource(raw: string | undefined): PaNegoSource {
  return raw === 'filter' || raw === 'item' ? raw : 'selection';
}

/** Assistant de négociation en 3 étapes : produits et prix, référents, récapitulatif et envoi. */
export function NegotiationScreen() {
  const params = useLocalSearchParams<{ source?: string; uuid?: string }>();
  const source = parseSource(params.source);
  const uuid = params.uuid;
  const { data: single } = useStagingDetail(source === 'item' ? uuid : undefined);
  const draft = useNegotiationDraft(source, uuid, source === 'item' ? single : undefined);
  const [step, setStep] = useState<Step>(1);
  const [confirmVolume, setConfirmVolume] = useState(false);
  const styles = useStyles();

  const result = draft.result;
  const readyCount = draft.ready.length;
  const needsAttention = draft.noWarehouseUuids.length + draft.serviceGroups.reduce((s, g) => s + g.uuids.length, 0);

  const goTo = (s: Step) => {
    setConfirmVolume(false);
    setStep(s);
  };

  if (result) {
    return <ResultView source={source} draftResult={result} />;
  }

  let footer;
  if (step === 1) {
    footer = (
      <Button
        label={draft.loading ? 'Chargement…' : `Continuer · ${plural(readyCount, 'produit')} prêt${readyCount > 1 ? 's' : ''}`}
        disabled={draft.loading || draft.items.length === 0}
        onPress={() => goTo(2)}
      />
    );
  } else if (step === 2) {
    footer = (
      <View style={styles.footerRow}>
        <View style={styles.flex}>
          <Button label="Retour" variant="outline" onPress={() => goTo(1)} />
        </View>
        <View style={styles.flex2}>
          <Button
            label={readyCount === 0 ? 'Aucun produit prêt' : 'Récapitulatif'}
            disabled={readyCount === 0 || draft.applying != null}
            onPress={() => goTo(3)}
          />
        </View>
      </View>
    );
  } else {
    const needsConfirm = readyCount > VOLUME_WARN_THRESHOLD && !confirmVolume;
    footer = (
      <View style={styles.footerRow}>
        <View style={styles.flex}>
          <Button label="Retour" variant="outline" disabled={draft.sending} onPress={() => goTo(2)} />
        </View>
        <View style={styles.flex2}>
          <Button
            label={
              draft.sending
                ? `Envoi ${draft.sendProgress?.done ?? 0}/${draft.sendProgress?.total ?? readyCount}…`
                : needsConfirm
                  ? `Confirmer l'envoi de ${formatInteger(readyCount)}`
                  : `Envoyer ${plural(readyCount, 'négociation')}`
            }
            leadingIcon={<Send size={16} color="#fff" />}
            loading={draft.sending}
            disabled={readyCount === 0}
            onPress={() => (needsConfirm ? setConfirmVolume(true) : void draft.send())}
          />
        </View>
      </View>
    );
  }

  return (
    <SheetScreen title="Négociation" closeLabel="Fermer" footer={footer} scroll={false}>
      <StepBar step={step} attention={needsAttention > 0} onGo={(s) => (s < step ? goTo(s) : undefined)} />
      {draft.loadError ? (
        <View style={styles.pad}>
          <InlineError message={draft.loadError} />
        </View>
      ) : draft.loading ? (
        <LoadingBlock progress={draft.loadProgress} source={source} />
      ) : draft.items.length === 0 ? (
        <View style={styles.centered}>
          <Info size={28} color={styles.muted.color} />
          <Text style={styles.centerTitle}>Rien à négocier</Text>
          <Text style={styles.centerText}>
            Les produits déjà lancés sont exclus : seuls les produits en attente peuvent partir en négociation.
          </Text>
        </View>
      ) : step === 1 ? (
        <ProductsStep draft={draft} single={source === 'item'} />
      ) : step === 2 ? (
        <ReferentsStep draft={draft} source={source} uuid={uuid} />
      ) : (
        <RecapStep draft={draft} confirmVolume={confirmVolume} />
      )}
    </SheetScreen>
  );
}

type Draft = ReturnType<typeof useNegotiationDraft>;

function InlineError({ message }: { message: string }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.inlineError} accessibilityRole="alert">
      <AlertTriangle size={16} color={t.danger} />
      <Text style={styles.inlineErrorText}>{message}</Text>
    </View>
  );
}

function StepBar({ step, attention, onGo }: { step: Step; attention: boolean; onGo: (s: Step) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.stepBar} accessibilityRole="tablist">
      {([1, 2, 3] as Step[]).map((s) => {
        const active = s === step;
        const done = s < step;
        return (
          <Pressable
            key={s}
            style={styles.stepItem}
            onPress={() => onGo(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Étape ${s} : ${STEP_LABELS[s]}`}
          >
            <View style={[styles.stepDot, (active || done) && styles.stepDotOn]}>
              {done ? (
                <Check size={12} color={styles.stepNumOn.color} />
              ) : (
                <Text style={[styles.stepNum, (active || done) && styles.stepNumOn]}>{s}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelOn]}>{STEP_LABELS[s]}</Text>
            {s === 2 && attention && step !== 2 ? <View style={styles.attnDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function LoadingBlock({ progress, source }: { progress: Draft['loadProgress']; source: PaNegoSource }) {
  const styles = useStyles();
  return (
    <View style={styles.centered}>
      <ActivityIndicator />
      <Text style={styles.centerTitle}>
        {source === 'filter' ? 'Récupération des produits du filtre…' : 'Préparation de la négociation…'}
      </Text>
      {progress ? (
        <Text style={styles.centerText}>
          {formatInteger(progress.loaded)}
          {progress.total ? ` / ${formatInteger(progress.total)}` : ''} produits
        </Text>
      ) : (
        <Text style={styles.centerText}>Calcul des prix et recherche des référents.</Text>
      )}
    </View>
  );
}

// ───────────────────────── Étape 1 : produits et prix ─────────────────────────

function ProductsStep({ draft, single }: { draft: Draft; single: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  const [customMargin, setCustomMargin] = useState('');
  const isPreset = (MARGIN_PRESETS as readonly number[]).includes(draft.targetMarginPct);
  const excluded = (Object.keys(draft.exclusionCounts) as ExclusionReason[]).filter(
    (k) => draft.exclusionCounts[k] > 0,
  );

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.summary}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryNum}>{formatInteger(draft.ready.length)}</Text>
          <Text style={styles.summaryLabel}>prêts à envoyer</Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryNum, { color: t.textMuted }]}>
            {formatInteger(draft.prepared.length - draft.ready.length)}
          </Text>
          <Text style={styles.summaryLabel}>exclus</Text>
        </View>
      </View>
      {draft.capped ? (
        <Text style={styles.warn}>Le filtre dépasse 2 000 produits : seuls les 2 000 premiers sont repris.</Text>
      ) : null}

      <Text style={styles.sectionLabel}>Marge cible</Text>
      <View style={styles.pills}>
        {MARGIN_PRESETS.map((m) => (
          <FilterPill
            key={m}
            label={`${m} %`}
            state={draft.targetMarginPct === m ? 'on' : 'off'}
            onPress={() => {
              setCustomMargin('');
              draft.changeMargin(m);
            }}
          />
        ))}
        <View style={[styles.marginInput, !isPreset && styles.marginInputOn]}>
          <TextInput
            value={customMargin}
            onChangeText={(v) => {
              setCustomMargin(v);
              const n = Number(v.replace(',', '.'));
              if (v.trim() !== '' && Number.isFinite(n)) draft.changeMargin(n);
            }}
            placeholder="Autre"
            placeholderTextColor={t.textFaint}
            keyboardType="decimal-pad"
            style={styles.marginText}
            accessibilityLabel="Marge cible personnalisée en pourcentage"
          />
          <Text style={styles.muted}>%</Text>
        </View>
      </View>
      <Text style={styles.hint}>
        Prix demandé = prix de vente cible moins la marge visée, moins le transport. Modifiable produit par produit
        {single ? ' ci-dessous.' : ' en touchant une ligne pour la retirer.'}
      </Text>

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>Inclure les prix de repli</Text>
          <Text style={styles.hint}>Prix par défaut à 85 % ou recommandé par l’IA, faute de prix de vente fiable.</Text>
        </View>
        <Switch
          value={draft.includeFallbackPrices}
          onValueChange={draft.setIncludeFallbackPrices}
          trackColor={{ true: t.accent, false: t.border }}
          accessibilityLabel="Inclure les prix de repli"
        />
      </View>

      {excluded.length > 0 ? (
        <View style={styles.excluded}>
          {excluded.map((k) => (
            <Text key={k} style={styles.excludedLine}>
              {formatInteger(draft.exclusionCounts[k])} {EXCLUSION_LABEL[k]}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={draft.prepared}
      keyExtractor={(p) => p.item.stagingUuid}
      ListHeaderComponent={header}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={12}
      windowSize={7}
      renderItem={({ item }) => (
        <PreparedRow
          p={item}
          single={single}
          onToggle={() => draft.toggleManual(item.item.stagingUuid)}
          onPrice={(v) => draft.setPriceFor(item.item.stagingUuid, v)}
        />
      )}
    />
  );
}

const PRICE_KIND_LABEL: Record<string, string> = {
  target: 'prix cible',
  pa_discount: 'remise sur PA',
  recommended: 'recommandé IA',
  fallback_85: 'repli 85 %',
  manual: 'saisi',
};

const PreparedRow = memo(function PreparedRow({
  p,
  single,
  onToggle,
  onPrice,
}: {
  p: PreparedItem;
  single: boolean;
  onToggle: () => void;
  onPrice: (v: number | null) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const [text, setText] = useState('');
  const on = p.exclusion == null;
  const hardBlocked = p.exclusion != null && p.exclusion !== 'manual' && p.exclusion !== 'fallback_price';
  const reason = p.exclusion ? EXCLUSION_LABEL[p.exclusion] : null;

  return (
    <View style={[styles.row, !on && styles.rowOff]}>
      <Pressable
        style={styles.rowMain}
        disabled={hardBlocked || single}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on, disabled: hardBlocked }}
        accessibilityLabel={p.item.designation}
      >
        {on ? <CheckCircle2 size={20} color={t.accent} /> : <Circle size={20} color={t.textFaint} />}
        <View style={styles.flex}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {p.item.designation}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {[p.item.codeEbat, p.item.ean, p.item.warehouse].filter(Boolean).join(' · ') || 'Aucun identifiant'}
          </Text>
          {reason ? <Text style={[styles.rowMeta, { color: hardBlocked ? t.warning : t.textMuted }]}>{reason}</Text> : null}
          {hardBlocked && p.exclusion === 'no_weight' && single ? (
            <Pressable onPress={() => openPaEdit('weight', { uuid: p.item.stagingUuid })} accessibilityRole="button">
              <Text style={styles.link}>Renseigner le poids</Text>
            </Pressable>
          ) : null}
        </View>
        {p.price != null ? (
          <View style={styles.priceCol}>
            <Text style={[styles.price, !on && { color: t.textMuted }]}>{formatEuro(p.price)}</Text>
            {p.priceKind ? <Text style={styles.rowMeta}>{PRICE_KIND_LABEL[p.priceKind]}</Text> : null}
          </View>
        ) : null}
      </Pressable>
      {single && !hardBlocked ? (
        <View style={styles.priceEdit}>
          <Text style={styles.rowMeta}>Prix HT demandé (€)</Text>
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              const n = Number(v.replace(',', '.'));
              onPrice(v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null);
            }}
            placeholder={p.price != null ? String(p.price) : 'Prix'}
            placeholderTextColor={t.textFaint}
            keyboardType="decimal-pad"
            style={styles.priceInput}
            accessibilityLabel="Prix demandé HT"
          />
        </View>
      ) : null}
    </View>
  );
});

// ───────────────────────── Étape 2 : référents ─────────────────────────

function ReferentsStep({ draft, source, uuid }: { draft: Draft; source: PaNegoSource; uuid: string | undefined }) {
  const styles = useStyles();
  const t = useTheme();
  const { withWarehouse, distributors } = useDistributors();
  const choices = withWarehouse.length > 0 ? withWarehouse : distributors;
  const [warehouse, setWarehouse] = useState('');
  const [groupChoice, setGroupChoice] = useState<Record<string, NegotiationCategoryType>>({});

  const whValue = warehouse || choices[0]?.ebatproWarehouse || '';

  // Destinataires prévus : nombre de produits par référent.
  const byReferent = new Map<string, number>();
  for (const p of draft.ready) for (const name of p.referentNames) byReferent.set(name, (byReferent.get(name) ?? 0) + 1);
  const referentList = Array.from(byReferent.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <ScrollView contentContainerStyle={styles.stepScroll} keyboardShouldPersistTaps="handled">
      {draft.applyError ? <InlineError message={draft.applyError} /> : null}

      {draft.noWarehouseUuids.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <AlertTriangle size={16} color={t.warning} />
            <Text style={styles.cardTitle}>{plural(draft.noWarehouseUuids.length, 'produit')} sans entrepôt</Text>
          </View>
          <Text style={styles.hint}>Sans entrepôt, on ne sait pas quels référents prévenir. Rattachez-les à un fournisseur.</Text>
          <ChoiceField
            label="Entrepôt"
            options={choices.map((d) => ({ value: d.ebatproWarehouse ?? d.id, label: d.name }))}
            value={whValue}
            onChange={setWarehouse}
          />
          <Button
            label={`Rattacher ${plural(draft.noWarehouseUuids.length, 'produit')}`}
            variant="secondary"
            loading={draft.applying === 'warehouse'}
            disabled={!whValue || draft.applying != null}
            onPress={() => void draft.applyWarehouse(draft.noWarehouseUuids, whValue)}
          />
        </View>
      ) : null}

      {draft.serviceGroups.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <AlertTriangle size={16} color={t.warning} />
            <Text style={styles.cardTitle}>Service à confirmer</Text>
          </View>
          <Text style={styles.hint}>
            Ces produits n’ont pas de service identifié automatiquement. Choisissez celui qui doit traiter la demande.
          </Text>
          {draft.serviceGroups.map((g) => {
            const value = groupChoice[g.key] ?? (g.suggested || '');
            return (
              <View key={g.key} style={styles.group}>
                <Text style={styles.rowTitle}>
                  {g.label} · {plural(g.uuids.length, 'produit')}
                </Text>
                <ChoiceField
                  label="Service"
                  options={NEGOTIATION_CATEGORY_TYPES.map((c) => ({ value: c.value, label: c.label }))}
                  value={value as NegotiationCategoryType}
                  onChange={(v) => setGroupChoice((prev) => ({ ...prev, [g.key]: v }))}
                />
                <Button
                  label={`Appliquer à ${plural(g.uuids.length, 'produit')}`}
                  variant="secondary"
                  loading={draft.applying === 'service'}
                  disabled={!value || draft.applying != null}
                  onPress={() => void draft.applyService(g.uuids, value as NegotiationCategoryType)}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Handshake size={16} color={t.accent} />
          <Text style={styles.cardTitle}>Qui sera prévenu</Text>
        </View>
        {draft.ready.length === 0 ? (
          <Text style={styles.hint}>Aucun produit prêt : revenez à l’étape 1 ou corrigez les points ci-dessus.</Text>
        ) : referentList.length === 0 ? (
          <Text style={styles.hint}>
            Aucun référent inscrit pour ces produits. Les demandes seront créées et visibles dès qu’un compte éligible
            (entrepôt + service) sera inscrit.
          </Text>
        ) : (
          <>
            <Text style={styles.hint}>
              {plural(draft.ready.length - draft.pendingReadyCount, 'produit')} avec référent
              {draft.pendingReadyCount > 0 ? `, ${plural(draft.pendingReadyCount, 'produit')} en attente d’un référent` : ''}.
            </Text>
            {referentList.slice(0, 12).map(([name, count]) => (
              <View key={name} style={styles.refRow}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.rowMeta}>{plural(count, 'produit')}</Text>
              </View>
            ))}
            {referentList.length > 12 ? <Text style={styles.hint}>… et {referentList.length - 12} autres référents.</Text> : null}
          </>
        )}
      </View>

      {source === 'item' && uuid ? (
        <Text style={styles.hint}>Besoin de corriger l’entrepôt ou le poids ? Modifiez le produit, l’assistant se met à jour.</Text>
      ) : null}
    </ScrollView>
  );
}

// ───────────────────────── Étape 3 : récapitulatif ─────────────────────────

function RecapStep({ draft, confirmVolume }: { draft: Draft; confirmVolume: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  const total = draft.ready.reduce((s, p) => s + (p.price ?? 0), 0);
  const skipped = draft.prepared.length - draft.ready.length;
  const sample = draft.ready.slice(0, 8);

  return (
    <ScrollView contentContainerStyle={styles.stepScroll}>
      {draft.sendError ? <InlineError message={draft.sendError} /> : null}
      <View style={styles.card}>
        <Text style={styles.recapBig}>{plural(draft.ready.length, 'négociation')}</Text>
        <Text style={styles.hint}>
          Marge cible {draft.targetMarginPct} % · valeur cumulée {formatEuro(total)} HT
        </Text>
        {skipped > 0 ? <Text style={styles.hint}>{plural(skipped, 'produit')} ne partiront pas (exclus à l’étape 1).</Text> : null}
        {draft.pendingReadyCount > 0 ? (
          <View style={styles.inline}>
            <Clock size={14} color={t.warning} />
            <Text style={[styles.hint, { color: t.warning }]}>
              {plural(draft.pendingReadyCount, 'demande')} sans référent pour l’instant : en attente d’inscription.
            </Text>
          </View>
        ) : null}
      </View>

      {confirmVolume ? (
        <View style={[styles.card, { borderColor: t.warning }]}>
          <View style={styles.cardHead}>
            <AlertTriangle size={16} color={t.warning} />
            <Text style={styles.cardTitle}>Gros volume</Text>
          </View>
          <Text style={styles.hint}>
            {formatInteger(draft.ready.length)} demandes vont notifier les référents. Appuyez de nouveau sur le bouton pour
            confirmer.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aperçu</Text>
        {sample.map((p) => (
          <View key={p.item.stagingUuid} style={styles.refRow}>
            <Text style={[styles.rowTitle, styles.flex]} numberOfLines={1}>
              {p.item.designation}
            </Text>
            <Text style={styles.price}>{formatEuro(p.price ?? 0)}</Text>
          </View>
        ))}
        {draft.ready.length > sample.length ? (
          <Text style={styles.hint}>… et {formatInteger(draft.ready.length - sample.length)} autres produits.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

// ───────────────────────── Résultat ─────────────────────────

function ResultView({
  source,
  draftResult,
}: {
  source: PaNegoSource;
  draftResult: NonNullable<Draft['result']>;
}) {
  const styles = useStyles();
  const t = useTheme();
  const created = draftResult.assigned.filter((a) => !a.updatedExisting).length;
  const updated = draftResult.assigned.length - created;
  const pending = draftResult.assigned.filter((a) => a.pendingReferents).length;
  const failed = draftResult.failed;
  const ok = failed.length === 0;

  return (
    <SheetScreen
      title="Résultat"
      closeLabel="Fermer"
      footer={
        <View style={styles.footerRow}>
          {source !== 'item' ? (
            <View style={styles.flex}>
              <Button
                label="Historique"
                variant="outline"
                onPress={() => {
                  router.back();
                  backToHistory();
                }}
              />
            </View>
          ) : null}
          <View style={styles.flex2}>
            <Button label="Terminer" onPress={() => router.back()} />
          </View>
        </View>
      }
    >
      <View style={styles.stepScroll}>
        <View style={styles.resultHero}>
          {ok ? <CheckCircle2 size={40} color={t.success} /> : <AlertTriangle size={40} color={t.warning} />}
          <Text style={styles.centerTitle}>
            {ok ? 'Négociations envoyées' : `${plural(draftResult.assigned.length, 'envoyée')}, ${plural(failed.length, 'en échec', 'en échec')}`}
          </Text>
        </View>
        <View style={styles.card}>
          <ResultLine label="Nouvelles demandes" value={created} />
          {updated > 0 ? <ResultLine label="Demandes mises à jour" value={updated} /> : null}
          {pending > 0 ? <ResultLine label="En attente de référent" value={pending} /> : null}
          {failed.length > 0 ? <ResultLine label="En échec" value={failed.length} danger /> : null}
        </View>
        {failed.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Échecs</Text>
            {failed.slice(0, 10).map((f) => (
              <Text key={f.stagingUuid} style={styles.rowMeta}>
                {f.stagingUuid.slice(0, 8)} · {f.reason || f.code}
              </Text>
            ))}
            {failed.length > 10 ? <Text style={styles.hint}>… et {failed.length - 10} autres.</Text> : null}
          </View>
        ) : null}
      </View>
    </SheetScreen>
  );
}

function ResultLine({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.refRow}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={[styles.price, danger && { color: t.danger }]}>{formatInteger(value)}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  muted: { color: t.textMuted, fontSize: fontSize.sm },
  pad: { padding: spacing.lg },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  stepBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  stepItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: hitTarget },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  stepDotOn: { backgroundColor: t.accent, borderColor: t.accent },
  stepNum: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  stepNumOn: { color: t.onAccent },
  stepLabel: { fontSize: fontSize.sm, color: t.textMuted, fontWeight: '500' },
  stepLabelOn: { color: t.text, fontWeight: '700' },
  attnDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.warning },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  centerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: t.text, textAlign: 'center' },
  centerText: { fontSize: fontSize.sm, color: t.textMuted, textAlign: 'center' },
  headerBlock: { padding: spacing.lg, gap: spacing.sm },
  listContent: { paddingBottom: spacing.xl },
  summary: { flexDirection: 'row', gap: spacing.md },
  summaryCol: {
    flex: 1,
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryNum: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  summaryLabel: { fontSize: fontSize.xs, color: t.textMuted },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: '700', color: t.text, marginTop: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  marginInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    minWidth: 84,
  },
  marginInputOn: { borderColor: t.accent },
  marginText: { color: t.text, fontSize: fontSize.sm, minWidth: 40, padding: 0 },
  hint: { fontSize: fontSize.xs, color: t.textMuted },
  warn: { fontSize: fontSize.xs, color: t.warning },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  excluded: { backgroundColor: t.surface, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  excludedLine: { fontSize: fontSize.xs, color: t.textMuted },
  row: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: t.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
  },
  rowOff: { opacity: 0.6 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: hitTarget },
  rowTitle: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  rowMeta: { fontSize: fontSize.xs, color: t.textMuted },
  link: { fontSize: fontSize.xs, color: t.accentText, fontWeight: '700', marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  priceEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  priceInput: {
    minWidth: 110,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: t.text,
    fontSize: fontSize.base,
    textAlign: 'right',
  },
  stepScroll: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: t.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  group: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: withAlpha(t.border, 0.6) },
  refRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recapBig: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: withAlpha(t.danger, 0.12),
  },
  inlineErrorText: { flex: 1, fontSize: fontSize.sm, color: t.danger },
  resultHero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
}));
