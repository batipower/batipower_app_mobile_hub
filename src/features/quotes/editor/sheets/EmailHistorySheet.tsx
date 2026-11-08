import { Alert, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { getQuoteEmailHistory, resendPaymentLink } from '@/api/hubCustomerQuotes';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Badge, Button } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { formatDateTime, formatEuro } from '@/lib/format';
import { openExternalUrl } from '@/lib/openWeb';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { quoteEmailHistoryKey } from '../../queryKeys';
import { useQuoteEditor } from '../QuoteEditorProvider';

const MODE_LABEL: Record<string, string> = {
  devis: 'Devis',
  virement: 'Commande — virement',
  paiement: 'Commande — paiement en ligne',
  web: 'Espace client',
  refus: 'Refus',
};

/** Historique des envois du devis (e-mails, PDF) et renvoi du lien de paiement. */
export function EmailHistorySheet() {
  const { state } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const quoteId = state.quoteId;

  const history = useQuery({
    queryKey: quoteEmailHistoryKey(quoteId ?? ''),
    queryFn: () => getQuoteEmailHistory(quoteId!),
    enabled: !!quoteId,
  });

  const canResend =
    state.quoteStatus === 'ENVOYE' && (history.data ?? []).some((h) => h.mode === 'paiement' && h.emailSent);
  const resend = useMutation({
    mutationFn: () => resendPaymentLink(quoteId!),
    onSuccess: () => {
      toast.success('Lien de paiement renvoyé.');
      void history.refetch();
    },
    onError: (e) => toast.error(errorMessage(e, 'Renvoi impossible')),
  });

  return (
    <SheetScreen title="Historique des envois" closeLabel="Fermer">
      {history.isPending ? <ListSkeleton rows={3} height={90} /> : null}
      {history.error ? (
        <ErrorBanner error={history.error} fallback="Historique indisponible" onRetry={() => void history.refetch()} />
      ) : null}
      {history.data && history.data.length === 0 ? (
        <EmptyState icon={null} title="Aucun envoi" text="Ce devis n'a pas encore été envoyé au client." />
      ) : null}
      {canResend ? (
        <Button
          variant="outline"
          label="Renvoyer le lien de paiement"
          loading={resend.isPending}
          onPress={() =>
            Alert.alert('Renvoyer le lien de paiement ?', 'Le client reçoit à nouveau l’e-mail avec le lien de paiement.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Renvoyer', onPress: () => resend.mutate() },
            ])
          }
        />
      ) : null}
      {(history.data ?? []).map((h) => (
        <View key={h.id} style={styles.item}>
          <View style={styles.head}>
            <Text style={styles.mode}>{MODE_LABEL[h.mode] ?? h.mode}</Text>
            {h.emailSent ? (
              <Badge label="Envoyé" tone="green" />
            ) : (
              <Badge label="Non envoyé" tone="red" />
            )}
          </View>
          <Text style={styles.sub}>
            {formatDateTime(h.createdAt) ?? ''}
            {h.recipientEmail ? ` · ${h.recipientEmail}` : ''}
          </Text>
          {h.subject ? <Text style={styles.subject}>{h.subject}</Text> : null}
          <Text style={styles.sub}>{formatEuro(h.totalTTC)} TTC</Text>
          {h.errorMessage ? (
            <View style={styles.error}>
              <XCircle size={13} color={t.danger} />
              <Text style={styles.errorText}>{h.errorMessage}</Text>
            </View>
          ) : null}
          {h.driveWebViewLink ? (
            <Button
              variant="ghost"
              label={h.pdfFileName ? `Ouvrir ${h.pdfFileName}` : 'Ouvrir le PDF'}
              leadingIcon={<ExternalLink size={14} color={t.accentText} />}
              onPress={() => void openExternalUrl(h.driveWebViewLink!)}
            />
          ) : h.emailSent ? (
            <View style={styles.ok}>
              <CheckCircle2 size={13} color={t.success} />
              <Text style={styles.sub}>PDF joint à l’e-mail</Text>
            </View>
          ) : null}
        </View>
      ))}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  item: { gap: spacing.xs, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: t.border },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  mode: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
  subject: { fontSize: fontSize.sm, color: t.text },
  error: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  errorText: { flex: 1, fontSize: fontSize.xs, color: t.danger },
  ok: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
}));
