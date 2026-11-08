import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Eye, Send } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { sendQuote } from '@/api/hubCustomerQuotes';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { formatEuro } from '@/lib/format';
import type { QuoteSendMode } from '@/types/hubCustomerQuotes';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { QuoteTextArea, ToggleRow } from '../../components/QuoteFields';
import { QUOTES_ROOT_KEY, quoteEmailHistoryKey } from '../../queryKeys';
import { quoteCustomerEmail, quoteCustomerName } from '../helpers';
import { useQuoteEditor } from '../QuoteEditorProvider';
import { useQuotePdfPreview } from '../useQuotePdfPreview';

type SendOption = { value: QuoteSendMode; title: string; subtitle: string };

const SEND_OPTIONS: SendOption[] = [
  {
    value: 'virement',
    title: 'Commande – virement',
    subtitle: 'PDF + RIB par e-mail. La commande PrestaShop est à créer à réception du virement.',
  },
  {
    value: 'paiement',
    title: 'Commande – paiement en ligne',
    subtitle: 'PDF + lien de paiement. La commande est créée automatiquement après paiement.',
  },
  {
    value: 'web',
    title: 'Espace client',
    subtitle: 'Le client retrouve le devis dans son compte sur le site (notification par e-mail facultative).',
  },
];

const MODE_LABEL: Record<string, string> = {
  virement: 'Commande — virement (RIB)',
  paiement: 'Commande — paiement en ligne',
  web: 'Espace client',
};

/**
 * Envoi du devis : aperçu du PDF, mode (virement, paiement en ligne, espace client), message
 * au client, puis double confirmation avant l'envoi. Le PDF est généré par le serveur.
 */
export function SendSheet() {
  const { state, derived, saveQuote, reload } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { preview, generating } = useQuotePdfPreview();

  const name = quoteCustomerName(state) || 'Client';
  const email = quoteCustomerEmail(state);
  const isPs = state.clientMode === 'prestashop';
  const nbLines = state.lines.filter((l) => (l.lineType ?? 'product') === 'product').length;
  const nextVersion = Math.max(state.currentRevision, 1) + 1;

  const defaultMessage = useMemo(() => {
    const refs = state.lines
      .filter((l) => (l.lineType ?? 'product') === 'product')
      .slice(0, 3)
      .map((l) => l.reference)
      .join(', ');
    return `Bonjour ${name},\n\nSuite à votre demande, veuillez trouver ci-joint notre devis${
      state.quoteReference ? ` ${state.quoteReference}` : ''
    }.\n\nCelui-ci concerne ${nbLines} article${nbLines > 1 ? 's' : ''}${
      nbLines > 0 ? ` (${refs}${nbLines > 3 ? '…' : ''})` : ''
    } pour un montant total TTC de ${formatEuro(derived.totals.totalTTC)}.\n\nCe devis est valable 30 jours à compter de sa date d'émission.\n\nN'hésitez pas à revenir vers nous pour toute question.\n\nCordialement,\nL'équipe Batipower`;
    // Message initial : calculé une seule fois à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [mode, setMode] = useState<QuoteSendMode>('virement');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [message, setMessage] = useState(defaultMessage);
  const [step, setStep] = useState<1 | 2>(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skipEmail = mode === 'web' && !notifyCustomer;
  const canSend = state.quoteStatus === 'BROUILLON' || state.revisionDraftOpen;
  const blockers = [...derived.sendBlockers];
  if (!email) blockers.push('Aucune adresse e-mail pour ce client.');
  const blocked = blockers.length > 0 || !state.quoteId;

  const confirm = async () => {
    if (!state.quoteId) return;
    if (mode === 'paiement' && !isPs) {
      setError("Paiement en ligne indisponible pour un prospect : rattachez d'abord un client PrestaShop.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      // Le serveur génère le PDF depuis la base : l'état affiché doit être enregistré d'abord.
      const saved = await saveQuote();
      if (!saved) {
        setSending(false);
        return;
      }
      await sendQuote(state.quoteId, skipEmail ? undefined : message, undefined, mode, !skipEmail);
      toast.success(
        skipEmail
          ? "Devis publié dans l'espace client (aucun e-mail envoyé)."
          : `E-mail envoyé à ${email}.`,
      );
      await Promise.all([
        reload(),
        queryClient.invalidateQueries({ queryKey: quoteEmailHistoryKey(state.quoteId) }),
        queryClient.invalidateQueries({ queryKey: QUOTES_ROOT_KEY }),
      ]);
      router.back();
    } catch (e) {
      setError(errorMessage(e, "Envoi impossible"));
      setStep(1);
    } finally {
      setSending(false);
    }
  };

  if (!canSend) {
    return (
      <SheetScreen title="Envoyer le devis" closeLabel="Fermer">
        <Text style={styles.muted}>
          Un devis déjà envoyé repart au client via sa version suivante : créez-la depuis l’éditeur.
        </Text>
      </SheetScreen>
    );
  }

  return (
    <SheetScreen
      title={state.revisionDraftOpen ? `Envoyer la version ${nextVersion}` : 'Envoyer le devis'}
      closeLabel="Fermer"
      closeDisabled={sending}
      footer={
        <View style={styles.footer}>
          {step === 2 ? (
            <>
              <Button
                label="Confirmer et envoyer"
                leadingIcon={<Send size={16} color={t.onAccent} />}
                loading={sending}
                onPress={() => void confirm()}
              />
              <Button variant="ghost" label="Retour" disabled={sending} onPress={() => setStep(1)} />
            </>
          ) : (
            <Button
              label={skipEmail ? "Publier dans l'espace client" : 'Continuer'}
              disabled={blocked}
              onPress={() => setStep(2)}
            />
          )}
        </View>
      }
    >
      {blockers.length > 0 ? (
        <View style={[styles.box, { backgroundColor: withAlpha(t.danger, 0.1) }]}>
          <AlertTriangle size={16} color={t.danger} />
          <View style={styles.boxBody}>
            {blockers.map((b) => (
              <Text key={b} style={[styles.boxText, { color: t.danger }]}>
                • {b}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.box, { backgroundColor: withAlpha(t.danger, 0.1) }]}>
          <AlertTriangle size={16} color={t.danger} />
          <Text style={[styles.boxText, { color: t.danger, flex: 1 }]}>{error}</Text>
        </View>
      ) : null}

      {step === 1 ? (
        <>
          <SheetSection title="Destinataire">
            <Text style={styles.recipient}>{name}</Text>
            <Text style={styles.muted}>{email || '—'}</Text>
            <Button
              variant="outline"
              label="Aperçu du PDF"
              leadingIcon={<Eye size={16} color={t.accentText} />}
              loading={generating}
              onPress={() => void preview()}
            />
          </SheetSection>

          <SheetSection title="Mode d'envoi">
            {SEND_OPTIONS.map((opt) => {
              const disabled = opt.value === 'paiement' && !isPs;
              const selected = mode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => setMode(opt.value)}
                  style={[styles.option, selected && styles.optionSelected, disabled && styles.optionDisabled]}
                >
                  <View style={[styles.radio, selected && { borderColor: t.accent }]}>
                    {selected ? <View style={[styles.radioDot, { backgroundColor: t.accent }]} /> : null}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                    <Text style={styles.muted}>
                      {disabled
                        ? "Indisponible pour un prospect : rattachez d'abord un client PrestaShop."
                        : opt.subtitle}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {mode === 'web' ? (
              <ToggleRow
                label="Notifier le client par e-mail"
                hint="Décochez pour publier le devis dans l'espace client sans envoyer d'e-mail."
                value={notifyCustomer}
                onValueChange={setNotifyCustomer}
              />
            ) : null}
          </SheetSection>

          {!skipEmail ? (
            <SheetSection title="Message">
              <QuoteTextArea
                label="Corps de l'e-mail (le PDF est joint)"
                value={message}
                onChangeText={setMessage}
                minHeight={180}
              />
            </SheetSection>
          ) : null}
        </>
      ) : (
        <View style={[styles.box, { backgroundColor: withAlpha(t.warning, 0.12) }]}>
          <Send size={16} color={t.warning} />
          <View style={styles.boxBody}>
            <Text style={[styles.boxTitle, { color: t.warning }]}>
              Confirmez l’envoi{state.revisionDraftOpen ? ` de la version ${nextVersion}` : ''}
            </Text>
            {state.revisionDraftOpen ? (
              <Text style={styles.boxText}>
                Elle remplace la version {nextVersion - 1} : le client ne verra plus que celle-ci
                {state.quoteStatus === 'ACCEPTE' ? ' et devra la valider à nouveau' : ''}. Les paiements non réglés de
                la version précédente seront abandonnés.
              </Text>
            ) : null}
            <Text style={styles.boxText}>
              Destinataire : <Text style={styles.strong}>{email}</Text>
            </Text>
            <Text style={styles.boxText}>
              Mode : <Text style={styles.strong}>{MODE_LABEL[mode]}</Text>
            </Text>
            <Text style={styles.boxText}>
              {mode === 'virement'
                ? "Un e-mail avec les coordonnées bancaires sera envoyé. Aucune commande PrestaShop n'est créée à cette étape : convertissez le devis à réception du virement."
                : mode === 'paiement'
                  ? 'Un lien de paiement en ligne sera envoyé. La commande PrestaShop sera créée automatiquement après paiement.'
                  : skipEmail
                    ? "Aucun e-mail ne sera envoyé : le client retrouvera ce devis dans son espace client (il doit avoir un compte sur le site)."
                    : 'Le client reçoit une notification par e-mail et retrouve le devis dans son espace client (il doit avoir un compte sur le site).'}
            </Text>
            <Text style={styles.boxText}>
              Total : <Text style={styles.strong}>{formatEuro(derived.totals.totalTTC)} TTC</Text>
            </Text>
          </View>
        </View>
      )}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
  muted: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  recipient: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  box: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'flex-start' },
  boxBody: { flex: 1, gap: spacing.sm },
  boxTitle: { fontSize: fontSize.sm, fontWeight: '700' },
  boxText: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  strong: { fontWeight: '700', color: t.text },
  option: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
  },
  optionSelected: { borderColor: t.accent, backgroundColor: withAlpha(t.accent, 0.06) },
  optionDisabled: { opacity: 0.5 },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
}));
