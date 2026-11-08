import { useEffect, useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { Ban, RefreshCw, Scale, TriangleAlert } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { fmtCur } from '@/features/product-analyzer/lib/helpers';
import { formatDateTime } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { AlreadyAnalyzedData, AnalysisReusedData, BlockedData } from '@/types/hubProductAnalyzer';

import type { WeightRequest } from '../socket/types';
import { PaDialog } from './PaDialog';

const WEIGHT_TIMEOUT_MS = 10 * 60_000;

function Facts({ rows }: { rows: { label: string; value: string; tone?: string }[] }) {
  const styles = useStyles();
  return (
    <View style={styles.facts}>
      {rows.map((row) => (
        <View key={row.label} style={styles.fact}>
          <Text style={styles.factLabel}>{row.label}</Text>
          <Text style={[styles.factValue, row.tone ? { color: row.tone } : null]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Message({ text, tone }: { text: string; tone: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.message, { backgroundColor: withAlpha(tone, 0.12), borderColor: withAlpha(tone, 0.35) }]}>
      <Text style={[styles.messageText, { color: tone }]}>{text}</Text>
    </View>
  );
}

/** Saisie du poids demandée par le serveur, avec le compte à rebours avant renonciation (0 g). */
export function WeightDialog({
  request,
  skipWeight,
  onSkipWeight,
  onSubmit,
}: {
  request: WeightRequest | null;
  skipWeight: boolean;
  onSkipWeight: (v: boolean) => void;
  onSubmit: (grams: number) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const [value, setValue] = useState('');
  const [remember, setRemember] = useState(skipWeight);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!request) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialisation à l'ouverture d'une nouvelle demande
    setValue('');
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [request]);

  const remaining = request ? Math.max(0, request.deadline - now) : 0;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const grams = parseFloat(value.replace(',', '.'));
  const valid = Number.isFinite(grams) && grams > 0;
  const ctx = request?.context ?? null;

  const submit = (g: number) => {
    onSkipWeight(remember);
    onSubmit(g);
  };

  return (
    <PaDialog
      visible={!!request}
      title="Saisie du poids"
      subtitle="Non déterminé automatiquement"
      tone={t.warning}
      icon={<Scale size={20} color={t.warning} />}
      footer={
        <>
          <Button label="Confirmer" disabled={!valid} onPress={() => submit(grams)} />
          <Button label="Ignorer (0 g)" variant="outline" onPress={() => submit(0)} />
        </>
      }
    >
      {ctx ? (
        <View style={styles.facts}>
          <Text style={styles.product}>{String(ctx.designation ?? 'Produit')}</Text>
          <Text style={styles.meta}>
            {[ctx.brand ? `Marque ${String(ctx.brand)}` : null, ctx.ean ? `EAN ${String(ctx.ean)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      ) : null}
      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Poids (grammes)</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="174"
          placeholderTextColor={t.textFaint}
          keyboardType="decimal-pad"
          autoFocus
          style={styles.input}
          accessibilityLabel="Poids en grammes"
        />
      </View>
      <View style={styles.countdown}>
        <Text style={styles.countdownText}>
          Sans réponse dans {minutes}:{String(seconds).padStart(2, '0')}, le poids sera ignoré (0 g).
        </Text>
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${Math.min(100, (remaining / WEIGHT_TIMEOUT_MS) * 100)}%`, backgroundColor: t.warning }]}
          />
        </View>
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Ne plus demander (ignorer automatiquement)</Text>
        <Switch value={remember} onValueChange={setRemember} trackColor={{ true: t.accent }} />
      </View>
    </PaDialog>
  );
}

/** Produit déjà au catalogue : analyse impossible, sauf en ligne de trace verrouillée. */
export function BlockedDialog({
  data,
  onClose,
  onForce,
}: {
  data: BlockedData | null;
  onClose: () => void;
  onForce: () => void;
}) {
  const t = useTheme();
  return (
    <PaDialog
      visible={!!data}
      title="Produit déjà référencé"
      subtitle="Analyse impossible"
      tone={t.danger}
      icon={<Ban size={20} color={t.danger} />}
      onClose={onClose}
      footer={
        <>
          <Button label="Analyser quand même (trace dans l'affaire)" variant="outline" onPress={onForce} />
          <Button label="Fermer" variant="ghost" onPress={onClose} />
        </>
      }
    >
      {data ? (
        <>
          <Message text={data.message} tone={t.danger} />
          <Facts
            rows={[
              { label: 'Source', value: data.existingRecord.source },
              { label: 'Référence', value: data.existingRecord.reference },
              {
                label: 'Actif',
                value: data.existingRecord.isActive ? 'Oui' : 'Non',
                tone: data.existingRecord.isActive ? t.success : t.textMuted,
              },
            ]}
          />
        </>
      ) : null}
    </PaDialog>
  );
}

/** Produit déjà analysé : on peut relancer l'analyse ou ouvrir la fiche existante. */
export function AlreadyAnalyzedDialog({
  data,
  onClose,
  onRelaunch,
  onOpenFiche,
}: {
  data: AlreadyAnalyzedData | null;
  onClose: () => void;
  onRelaunch: () => void;
  onOpenFiche: (uuid: string) => void;
}) {
  const t = useTheme();
  return (
    <PaDialog
      visible={!!data}
      title="Analyse déjà effectuée"
      subtitle="Ce produit a été analysé précédemment"
      tone={t.warning}
      icon={<TriangleAlert size={20} color={t.warning} />}
      onClose={onClose}
      footer={
        <>
          <Button
            label="Relancer l'analyse"
            leadingIcon={<RefreshCw size={16} color={t.onAccent} />}
            onPress={onRelaunch}
          />
          {data ? <Button label="Voir la fiche" variant="outline" onPress={() => onOpenFiche(data.staging.uuid)} /> : null}
          <Button label="Fermer" variant="ghost" onPress={onClose} />
        </>
      }
    >
      {data ? (
        <>
          <Message text={`Dernière analyse le ${formatDateTime(data.staging.updatedAt) ?? '—'}`} tone={t.warning} />
          <Facts
            rows={[
              { label: 'Statut', value: data.staging.status },
              {
                label: 'Viable',
                value: data.staging.isViable === null ? '—' : data.staging.isViable ? 'Oui' : 'Non',
                tone: data.staging.isViable ? t.success : data.staging.isViable === false ? t.danger : undefined,
              },
              { label: 'Analyses', value: String(data.staging.analysisCount) },
            ]}
          />
        </>
      ) : null}
    </PaDialog>
  );
}

/** Analyse réutilisée (staging existant mis à jour) ou référence déjà introuvable dans EbatPro. */
export function ReusedDialog({
  data,
  onClose,
  onOpenFiche,
  onAttachEan,
}: {
  data: AnalysisReusedData | null;
  onClose: () => void;
  onOpenFiche: (uuid: string) => void;
  onAttachEan: (data: AnalysisReusedData) => void;
}) {
  const t = useTheme();
  const notFound = data?.reason === 'EBAT_NOT_FOUND_REUSED';
  const tone = notFound ? t.warning : t.info;
  return (
    <PaDialog
      visible={!!data}
      title={notFound ? 'Référence déjà introuvable' : 'Analyse réutilisée'}
      subtitle={notFound ? 'Analyse EBAT_NOT_FOUND existante' : 'Analyse existante mise à jour'}
      tone={tone}
      icon={notFound ? <TriangleAlert size={20} color={tone} /> : <RefreshCw size={20} color={tone} />}
      onClose={onClose}
      footer={
        <>
          {notFound && data ? <Button label="Attacher un EAN" onPress={() => onAttachEan(data)} /> : null}
          {data ? (
            <Button
              label="Voir la fiche"
              variant={notFound ? 'outline' : 'primary'}
              onPress={() => onOpenFiche(data.staging.uuid)}
            />
          ) : null}
          <Button label="Fermer" variant="ghost" onPress={onClose} />
        </>
      }
    >
      {data ? (
        <>
          <Message text={data.message} tone={tone} />
          {!notFound ? (
            <Facts
              rows={[
                ...(data.warehouse ? [{ label: 'Entrepôt', value: data.warehouse }] : []),
                ...(data.purchasePriceHTRefreshed != null
                  ? [{ label: 'PA rafraîchi', value: fmtCur(data.purchasePriceHTRefreshed) }]
                  : []),
                {
                  label: 'Viable',
                  value: data.staging.isViable === null ? '—' : data.staging.isViable ? 'Oui' : 'Non',
                  tone: data.staging.isViable ? t.success : data.staging.isViable === false ? t.danger : undefined,
                },
              ]}
            />
          ) : null}
        </>
      ) : null}
    </PaDialog>
  );
}

const useStyles = makeStyles((t) => ({
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  fact: { gap: 2 },
  factLabel: { fontSize: 10, fontWeight: '600', color: t.textSubtle, textTransform: 'uppercase' },
  factValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  message: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  messageText: { fontSize: fontSize.sm, fontWeight: '600', lineHeight: 19 },
  product: { width: '100%', fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  meta: { width: '100%', fontSize: fontSize.xs, color: t.textMuted },
  inputWrap: { gap: spacing.xs },
  inputLabel: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  input: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    fontFamily: monoFontFamily,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: t.text,
  },
  countdown: { gap: spacing.sm },
  countdownText: { fontSize: fontSize.xs, color: t.warning },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: t.surface },
  fill: { height: '100%', borderRadius: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { flex: 1, fontSize: fontSize.sm, color: t.text },
}));
