import { Alert, Text } from 'react-native';

import { Button, DetailSection, InfoRow } from '@/components/ui';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles } from '@/theme';
import type { HubPalletQuote } from '@/types/hubPalletFlow';
import type { HubOrder } from '@/types/order';

import { usePalletFlowMutations } from '../hooks/usePalletFlowMutations';

type Props = {
  order: HubOrder;
  /** Devis `ANSWERED` portant le prix reçu du dépôt. */
  quote: HubPalletQuote;
};

/**
 * Décision une fois le prix palette reçu : accepter le prix (enlèvement palette, email de
 * confirmation envoyé au dépôt) ou le refuser (la commande repasse en flux classique). La marge
 * de chaque flux est affichée juste au-dessus, dans la section « Marge actuelle ».
 */
export function PalletQuoteDecisionSection({ order, quote }: Props) {
  const styles = useStyles();
  const { acceptQuote, rejectQuote } = usePalletFlowMutations(order.reference);
  const busy = acceptQuote.isPending || rejectQuote.isPending;

  const delta =
    quote.quotedPriceHT != null && quote.glsReferencePriceHT
      ? quote.quotedPriceHT - quote.glsReferencePriceHT
      : null;

  const confirmAccept = () => {
    Alert.alert(
      'Accepter le prix palette ?',
      `La commande ${order.reference} partira en enlèvement palette et un email de confirmation sera envoyé au dépôt.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Accepter', onPress: () => acceptQuote.mutate(quote.uuid) },
      ],
    );
  };

  const confirmReject = () => {
    Alert.alert(
      'Refuser et passer en flux classique ?',
      `Le prix palette sera refusé et ${order.reference} traitée comme une commande normale, sans enlèvement palette.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Flux classique', style: 'destructive', onPress: () => rejectQuote.mutate(quote.uuid) },
      ],
    );
  };

  return (
    <DetailSection title="Décision : prix palette reçu">
      <InfoRow
        label="Prix palette HT"
        value={quote.quotedPriceHT != null ? formatEuro(quote.quotedPriceHT) : '—'}
      />
      {delta != null ? (
        <InfoRow
          label="Écart transport vs GLS"
          value={`${delta > 0 ? '+' : ''}${formatEuro(delta)}`}
        />
      ) : null}
      <Text style={styles.hint}>
        Comparez la marge du flux classique et du flux palette ci-dessus, puis choisissez.
      </Text>

      <Button
        label="Accepter le prix palette"
        loading={acceptQuote.isPending}
        disabled={busy}
        onPress={confirmAccept}
      />
      <Button
        label="Refuser, flux classique"
        variant="outline"
        destructive
        loading={rejectQuote.isPending}
        disabled={busy}
        onPress={confirmReject}
      />
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
}));
