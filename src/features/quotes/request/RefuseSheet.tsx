import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Send, Undo2 } from 'lucide-react-native';
import { toast } from 'sonner-native';

import {
  draftRefusalEmail,
  refuseQuote,
  refuseQuoteRequest,
} from '@/api/hubCustomerQuotes';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button, Chip, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { RefusalTargetKind, RefusalTone } from '@/types/hubCustomerQuotes';

import { QuoteTextArea, ToggleRow } from '../components/QuoteFields';
import { QUOTES_ROOT_KEY } from '../queryKeys';

const REFUSAL_REASONS: { id: string; label: string; detail: string }[] = [
  { id: 'REFERENCE', label: 'Référence non gérée', detail: 'les références demandées ne font pas partie de notre référencement' },
  { id: 'INDISPONIBLE', label: 'Produit indisponible', detail: 'les produits demandés sont indisponibles ou ont été arrêtés par le fabricant' },
  { id: 'QUANTITE', label: 'Quantité hors conditions', detail: 'les quantités demandées ne correspondent pas à nos conditions de vente' },
  { id: 'DELAI', label: 'Délai incompatible', detail: "le délai souhaité est incompatible avec nos délais d'approvisionnement" },
  { id: 'ZONE', label: 'Hors zone', detail: "l'adresse de livraison se situe en dehors de notre zone de couverture" },
  { id: 'TARIF', label: 'Tarif non compétitif', detail: 'nous ne sommes pas en mesure de proposer un tarif compétitif sur cette gamme' },
  { id: 'AUTRE', label: 'Autre motif', detail: '' },
];

const TONES: { id: RefusalTone; label: string }[] = [
  { id: 'NEUTRE', label: 'Neutre' },
  { id: 'COMMERCIAL', label: 'Commercial' },
  { id: 'FERME', label: 'Ferme' },
];

type RefuseSheetProps = {
  /** Demande de devis ou devis refusé : seul l'appel API et le libellé changent. */
  target: RefusalTargetKind;
  /** Identifiant à refuser ; par défaut, le paramètre `id` de la route. */
  targetId?: string;
  /** Appelé après un refus réussi, une fois les caches invalidés (rechargement de l'éditeur). */
  onRefused?: () => void;
};

/**
 * Feuille de refus commercial (demande ou devis), portée depuis `RefuseDialog` du web : motif,
 * brouillon d'e-mail rédigé par l'IA (registre, consigne d'affinage, annulation), objet et corps
 * entièrement modifiables, envoi facultatif au prospect. L'identifiant vient du paramètre `id`.
 */
export function RefuseSheet({ target, targetId, onRefused }: RefuseSheetProps) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = targetId ?? params.id;
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();

  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [reason, setReason] = useState(REFUSAL_REASONS[0]!.detail);
  const [reasonId, setReasonId] = useState(REFUSAL_REASONS[0]!.id);
  const [tone, setTone] = useState<RefusalTone>('NEUTRE');
  const [instruction, setInstruction] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [undo, setUndo] = useState<{ subject: string; body: string } | null>(null);
  const busy = drafting || submitting;

  const requestDraft = useCallback(
    async (args: { reason: string; tone: RefusalTone; refineFrom?: string; instruction?: string }) => {
      setDrafting(true);
      setError(null);
      try {
        const draft = await draftRefusalEmail({
          target,
          targetId: id,
          reason: args.reason.trim() || undefined,
          tone: args.tone,
          currentBody: args.refineFrom?.trim() || undefined,
          instruction: args.instruction?.trim() || undefined,
        });
        setSubject(draft.subject);
        setBody(draft.body);
        setAiEnhanced(draft.aiEnhanced);
        setWarnings(draft.warnings ?? []);
        if (draft.recipientEmail) setRecipient(draft.recipientEmail);
      } catch (e) {
        setError(errorMessage(e, 'Impossible de générer le brouillon'));
      } finally {
        setDrafting(false);
      }
    },
    [target, id],
  );

  // Premier brouillon à l'ouverture (une seule fois : l'effet ne dépend que de l'identifiant).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void requestDraft({ reason: REFUSAL_REASONS[0]!.detail, tone: 'NEUTRE' });
  }, [requestDraft]);

  const pickReason = (reasonKey: string) => {
    setReasonId(reasonKey);
    setReason(REFUSAL_REASONS.find((r) => r.id === reasonKey)?.detail ?? '');
  };

  const regenerate = () => {
    setUndo({ subject, body });
    void requestDraft({ reason, tone });
  };

  const refine = () => {
    if (!body.trim()) return;
    setUndo({ subject, body });
    void requestDraft({ reason, tone, refineFrom: body, instruction });
  };

  const confirm = async () => {
    if (sendEmail && (!subject.trim() || !body.trim())) {
      setError("Objet et message obligatoires pour envoyer l'e-mail.");
      return;
    }
    if (sendEmail && !recipient.trim()) {
      setError("Aucun destinataire : renseignez une adresse ou désactivez l'envoi de l'e-mail.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
        reason: reason.trim() || undefined,
        recipientEmail: sendEmail ? recipient.trim() : undefined,
        sendEmail,
      };
      const result =
        target === 'QUOTE' ? await refuseQuote(id, payload) : await refuseQuoteRequest(id, payload);
      await queryClient.invalidateQueries({ queryKey: QUOTES_ROOT_KEY });
      if (result.errorMessage) toast.error(`Refus enregistré, e-mail non envoyé : ${result.errorMessage}`);
      else if (result.emailSent) toast.success(`Refus envoyé à ${result.recipientEmail ?? 'au prospect'}.`);
      else toast.success('Refus enregistré (sans e-mail).');
      onRefused?.();
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Impossible de refuser'));
    } finally {
      setSubmitting(false);
    }
  };

  const label = target === 'QUOTE' ? 'le devis' : 'la demande';

  return (
    <SheetScreen
      title={`Refuser ${label}`}
      closeLabel="Fermer"
      closeDisabled={submitting}
      footer={
        <View style={styles.footer}>
          <Button
            label={sendEmail ? 'Refuser et envoyer' : 'Refuser sans e-mail'}
            loading={submitting}
            disabled={drafting}
            leadingIcon={<Send size={16} color={t.onAccent} />}
            onPress={() => void confirm()}
          />
          <Text style={styles.footerHint}>
            {target === 'QUOTE'
              ? 'Le devis passera au statut « Refusé ».'
              : 'La demande passera au statut « Refusée ».'}
          </Text>
        </View>
      }
    >
      <SheetSection title="Motif du refus">
        <View style={styles.wrap}>
          {REFUSAL_REASONS.map((r) => (
            <Chip key={r.id} label={r.label} active={reasonId === r.id} onPress={() => pickReason(r.id)} />
          ))}
        </View>
        <TextField
          label="Motif communiqué au prospect"
          value={reason}
          onChangeText={setReason}
          maxLength={500}
          editable={!busy}
        />
      </SheetSection>

      <SheetSection title="Rédaction assistée">
        <View style={styles.aiBox}>
          <View style={styles.aiHeader}>
            {drafting ? <ActivityIndicator size="small" color={t.info} /> : null}
            <Text style={styles.aiStatus}>
              {drafting ? 'Génération…' : aiEnhanced ? 'Brouillon généré par IA' : 'Brouillon standard'}
            </Text>
          </View>
          <View style={styles.wrap}>
            {TONES.map((tone_) => (
              <Chip key={tone_.id} label={tone_.label} active={tone === tone_.id} onPress={() => setTone(tone_.id)} />
            ))}
          </View>
          <View style={styles.wrap}>
            <Button
              label="Générer"
              variant="outline"
              leadingIcon={<RotateCcw size={14} color={t.text} />}
              disabled={busy}
              onPress={regenerate}
              style={styles.smallButton}
            />
            {undo ? (
              <Button
                label="Annuler l'IA"
                variant="outline"
                leadingIcon={<Undo2 size={14} color={t.text} />}
                disabled={busy}
                onPress={() => {
                  setSubject(undo.subject);
                  setBody(undo.body);
                  setUndo(null);
                }}
                style={styles.smallButton}
              />
            ) : null}
          </View>
          <TextField
            label="Consigne d'affinage"
            value={instruction}
            onChangeText={setInstruction}
            placeholder="Plus court, plus chaleureux, propose une alternative…"
            maxLength={1000}
            editable={!busy}
          />
          <Button
            label="Raffiner le message"
            variant="secondary"
            disabled={busy || !body.trim()}
            onPress={refine}
          />
        </View>
      </SheetSection>

      <SheetSection title="E-mail">
        <ToggleRow
          label="Envoyer l'e-mail au prospect"
          hint="Il peut répondre directement. Désactivez pour acter le refus sans envoi."
          value={sendEmail}
          onValueChange={setSendEmail}
          disabled={busy}
        />
        <TextField
          label="Destinataire"
          value={recipient}
          onChangeText={setRecipient}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy && sendEmail}
          placeholder="email@prospect.fr"
        />
        <TextField
          label="Objet"
          value={subject}
          onChangeText={setSubject}
          maxLength={300}
          editable={!busy}
        />
        <QuoteTextArea
          label="Message (entièrement modifiable)"
          value={body}
          onChangeText={setBody}
          minHeight={220}
          maxLength={20000}
          editable={!busy}
          autoCorrect={false}
        />
      </SheetSection>

      {warnings.length > 0 ? (
        <View style={styles.warning}>
          {warnings.map((w) => (
            <Text key={w} style={styles.warningText}>
              {w}
            </Text>
          ))}
        </View>
      ) : null}
      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
  footerHint: { fontSize: fontSize.xs, color: t.textMuted, textAlign: 'center' },
  aiBox: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: withAlpha(t.info, 0.08),
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.25),
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiStatus: { fontSize: fontSize.xs, fontWeight: '600', color: t.info },
  smallButton: { minHeight: 36, paddingHorizontal: spacing.md },
  warning: {
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: withAlpha(t.warning, 0.12),
  },
  warningText: { fontSize: fontSize.xs, color: t.warning },
  error: { padding: spacing.md, borderRadius: radius.md, backgroundColor: t.dangerBg },
  errorText: { fontSize: fontSize.xs, color: t.danger },
}));
