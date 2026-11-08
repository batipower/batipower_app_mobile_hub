import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { cancelQuote } from '@/api/hubCustomerQuotes';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, useTheme } from '@/theme';

import { QuoteTextArea, ToggleRow } from '../../components/QuoteFields';
import { QUOTES_ROOT_KEY } from '../../queryKeys';
import { useQuoteEditor } from '../QuoteEditorProvider';

/** Annulation d'un devis envoyé, accepté ou converti (avec, au choix, celle de la commande PrestaShop). */
export function CancelSheet() {
  const { state, reload, patch } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [cancelOrder, setCancelOrder] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasOrder = !!state.prestashopOrderId || state.quoteStatus === 'CONVERTED';

  const submit = async () => {
    if (!state.quoteId) return;
    setBusy(true);
    try {
      const result = await cancelQuote(state.quoteId, {
        cancelPrestashopOrder: hasOrder && cancelOrder,
        reason: reason.trim() || undefined,
      });
      patch({ quoteStatus: 'ANNULE', dirty: false });
      toast.success(
        result.alreadyCancelled
          ? 'Ce devis était déjà annulé.'
          : result.prestashopOrderCancelled
            ? 'Devis et commande PrestaShop annulés.'
            : 'Devis annulé.',
      );
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: QUOTES_ROOT_KEY })]);
      router.back();
    } catch (e) {
      toast.error(errorMessage(e, "Annulation impossible"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetScreen
      title="Annuler le devis"
      closeLabel="Fermer"
      closeDisabled={busy}
      footer={
        <Button
          label="Annuler le devis"
          destructive
          variant="outline"
          leadingIcon={<Ban size={16} color={t.danger} />}
          loading={busy}
          onPress={() => void submit()}
          style={{ marginBottom: 12 }}
        />
      }
    >
      <Text style={styles.text}>
        Le devis passe au statut « Annulé » et devient définitivement non modifiable. Le client n’est pas prévenu par
        e-mail.
      </Text>
      {hasOrder ? (
        <ToggleRow
          label="Annuler aussi la commande PrestaShop"
          hint="La commande liée à ce devis est annulée côté boutique."
          value={cancelOrder}
          onValueChange={setCancelOrder}
        />
      ) : null}
      <QuoteTextArea label="Motif interne (facultatif)" value={reason} onChangeText={setReason} maxLength={300} />
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  text: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
}));
