import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { Button, DetailSection, TextField } from '@/components/ui';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubOrder } from '@/types/order';

import { usePalletFlowMutations } from '../hooks/usePalletFlowMutations';

type Props = {
  order: HubOrder;
};

/**
 * Arbitrage d'une commande candidate : demander le prix palette au dépôt (commentaire facultatif),
 * ou la renvoyer en flux classique (avec confirmation, l'action est définitive côté dépôt).
 */
export function PalletActionsSection({ order }: Props) {
  const styles = useStyles();
  const { requestQuote, revertToClassic } = usePalletFlowMutations(order.reference);
  const [composing, setComposing] = useState(false);
  const [comment, setComment] = useState('');
  const busy = requestQuote.isPending || revertToClassic.isPending;

  // Même repli que le web : entrepôt naturel, sinon entrepôt d'affectation actuel.
  const warehouse = order.palletNaturalWarehouse ?? order.warehouseOrder?.warehouseAffectation ?? null;

  const sendRequest = () => {
    if (!warehouse) {
      toast.error("Entrepôt d'origine inconnu : demandez le prix depuis l'espace web.");
      return;
    }
    requestQuote.mutate(
      { warehouse, comment },
      {
        onSuccess: () => {
          setComposing(false);
          setComment('');
        },
      },
    );
  };

  const confirmRevert = () => {
    Alert.alert(
      'Passer en flux classique ?',
      `La commande ${order.reference} sera traitée comme une commande normale, sans enlèvement palette.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Flux classique', style: 'destructive', onPress: () => revertToClassic.mutate() },
      ],
    );
  };

  return (
    <DetailSection title="Décision">
      <Text style={styles.hint}>
        Demandez le prix palette au dépôt, ou traitez cette commande comme une commande classique.
      </Text>

      {composing ? (
        <View style={styles.compose}>
          <TextField
            label="Commentaire (facultatif)"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            placeholder="Précision pour le dépôt…"
            editable={!busy}
          />
          <View style={styles.row}>
            <Button
              label="Annuler"
              variant="outline"
              disabled={busy}
              onPress={() => setComposing(false)}
              style={styles.flex}
            />
            <Button
              label="Envoyer la demande"
              loading={requestQuote.isPending}
              disabled={busy}
              onPress={sendRequest}
              style={styles.flex}
            />
          </View>
        </View>
      ) : (
        <Button label="Demander le prix palette" disabled={busy} onPress={() => setComposing(true)} />
      )}

      <Button
        label="Passer en flux classique"
        variant="outline"
        destructive
        loading={revertToClassic.isPending}
        disabled={busy}
        onPress={confirmRevert}
      />
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  compose: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
}));
